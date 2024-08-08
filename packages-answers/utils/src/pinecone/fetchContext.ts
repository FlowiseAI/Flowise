import { PineconeClient } from '@pinecone-database/pinecone'
import { pineconeQuery } from './pineconeQuery'

import { prisma } from '@db/client'

import OpenAIClient from '../openai/openai'
import { countTokens } from '../utilities/countTokens'
import { renderTemplate } from '../utilities/renderTemplate'
import getUserContextFields from '../utilities/getUserContextFields'
import getOrganizationContextFields from '../utilities/getOrganizationContextFields'
import { getUniqueUrl } from '../getUniqueUrls'

import { AnswersFilters, Message, User, Sidekick, Organization, SourceFilters } from 'types'
import { getRemainingAvailableTokens } from '../getRemainingAvailableTokens'

const PUBLIC_SOURCES = ['web', 'drive', 'github', 'notion', 'airtable']
const EMBEDDING_MODEL = 'text-embedding-ada-002'
const DEFAULT_THRESHOLD = 0.68
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

type PineconeQueryObject = {
    namespace?: string
    filter: {
        [key: string]:
            | {
                  $in: string[]
              }
            | string
    }
    topK: number
}

const mapFiltersToQueries = (data: AnswersFilters, organizationId?: string) => {
    return Object.entries(data.datasources || {}).reduce((acc, [source, sourceObject]) => {
        Object.entries(sourceObject as SourceFilters).forEach(([filterKey, { sources }]) => {
            acc.push(
                ...sources.map(({ filter }) => ({
                    ...(!PUBLIC_SOURCES.includes(source) && organizationId ? { namespace: `org-${organizationId}` } : {}),
                    filter: {
                        // TODO: in the future, we may want to also filter based on the model. not used right now
                        // model: { "$in": [data.model] }
                        source,
                        ...filter,
                        ...(filterKey === 'url' &&
                            source === 'web' &&
                            filter.url && {
                                url: getUniqueUrl(filter.url)
                            })
                    },
                    topK: 500
                }))
            )
        })
        return acc
    }, [] as PineconeQueryObject[])
}

const openai = new OpenAIClient()
export const pinecone = new PineconeClient()

const filterPineconeDataRelevanceThreshhold = (data: any[], threshold: number) => {
    if (!data) return []

    const sortedData = data
        .filter((x: { score: number }) => x.score > threshold)
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score)

    return sortedData
}

export const fetchContext = async ({
    user,
    organizationId,
    organization,
    prompt,
    messages = [],
    filters: clientFilters = {},
    sidekick, // added default value
    gptModel = 'gpt-3.5-turbo'
}: {
    user?: User
    organizationId?: string
    organization?: Organization
    prompt: string
    messages?: Message[]
    filters?: AnswersFilters
    sidekick?: Sidekick
    gptModel?: string
}) => {
    const ts = `${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const queries = mapFiltersToQueries(clientFilters, organizationId)

    console.log('client filters', clientFilters)
    console.log('queries', queries)

    const promptEmbedding = await openai.createEmbedding({
        user,
        input: prompt?.toLowerCase(),
        model: EMBEDDING_MODEL
    })

    console.time(`[${ts}] Pineconedata`)
    console.time(`[${ts}] Pineconedata get`)

    const pineconeData = await Promise.all(queries.map(async (q) => pineconeQuery(promptEmbedding, q)))?.then((vectors) =>
        vectors?.map((v) => v?.matches || []).flat()
    )

    console.timeEnd(`[${ts}] Pineconedata get`)

    // Filter out any results that are above the relavance threshold, sort by score and return the max number based on gptModel
    let relevantData = pineconeData.length ? filterPineconeDataRelevanceThreshhold(pineconeData, DEFAULT_THRESHOLD) : []

    if (!relevantData.length && pineconeData.length) {
        if (queries.length === 2) {
            console.log("No relevent data found.   Since there are 2 sources, we're lowering the filtering threshold")
            relevantData = filterPineconeDataRelevanceThreshhold(pineconeData, DEFAULT_THRESHOLD / 2)
        } else if (queries.length === 1) {
            console.log("No relevent data found.   Since there is 1 source, we're removing the filtering threshold")
            relevantData = pineconeData
        }
    }

    let context: string = ''
    const contextSourceFilesUsed = new Set<string>()
    let filteredData: Array<string | null> = []

    // Get organization's custom contact fields
    const organizationContext: Record<string, any> = getOrganizationContextFields(organization)

    // Get user's custom contect fields
    const userContext: Record<string, any> = getUserContextFields(user)

    if (!!relevantData?.length) {
        // Render the context string based on the sidekick and number of tokens

        // get the number of tokens remaining for the context string
        let remainingAvailableTokens = await getRemainingAvailableTokens({
            sidekick,
            input: prompt,
            userContext,
            organizationContext,
            model: gptModel
        })

        const contexts = relevantData.map((item) => {
            if (remainingAvailableTokens <= 0) {
                return null
            }

            let renderedContext: string = item?.metadata?.text?.trim() ?? ''

            const preTokenCount = renderedContext !== '' ? countTokens(renderedContext) : 0

            const contextStringRender = sidekick?.contextStringRender?.trim() !== '' ? sidekick?.contextStringRender : null

            if (preTokenCount > remainingAvailableTokens) {
                return null
            }

            if (contextStringRender) {
                renderedContext = renderTemplate(contextStringRender, {
                    result: item.metadata,
                    organization: organizationContext,
                    user: userContext
                }).trim()
            }

            if (renderedContext === '') return null

            const tokenCount = countTokens(renderedContext)
            if (tokenCount > remainingAvailableTokens) {
                return null
            }

            // TODO: standardize the canonical location (UUID) of the file
            contextSourceFilesUsed.add(item?.metadata?.filePath || item?.metadata?.url)
            remainingAvailableTokens -= tokenCount
            return renderedContext
        })

        filteredData = contexts
        context = filteredData.filter((result) => result !== null).join('\n\n')
    }

    const contextDocuments = await prisma.document.findMany({
        where: {
            url: { in: Array.from(contextSourceFilesUsed) }
        }
    })

    return {
        context,
        contextDocuments,
        ...(IS_DEVELOPMENT
            ? {
                  pineconeFilters: queries.map((q) => q.filter),
                  filteredData,
                  pineconeData
              }
            : {})
    }
}
