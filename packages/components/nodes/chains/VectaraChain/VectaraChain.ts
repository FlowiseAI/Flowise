import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { VectorDBQAChain } from 'langchain/chains'
import { Document } from 'langchain/document'
import { VectaraStore } from 'langchain/vectorstores/vectara'
import fetch from 'node-fetch'

// functionality based on https://github.com/vectara/vectara-answer
const reorderCitations = (unorderedSummary: string) => {
    const allCitations = unorderedSummary.match(/\[\d+\]/g) || []

    const uniqueCitations = [...new Set(allCitations)]
    const citationToReplacement: { [key: string]: string } = {}
    uniqueCitations.forEach((citation, index) => {
        citationToReplacement[citation] = `[${index + 1}]`
    })

    return unorderedSummary.replace(/\[\d+\]/g, (match) => citationToReplacement[match])
}
const applyCitationOrder = (searchResults: any[], unorderedSummary: string) => {
    const orderedSearchResults: any[] = []
    const allCitations = unorderedSummary.match(/\[\d+\]/g) || []

    const addedIndices = new Set<number>()
    for (let i = 0; i < allCitations.length; i++) {
        const citation = allCitations[i]
        const index = Number(citation.slice(1, citation.length - 1)) - 1

        if (addedIndices.has(index)) continue
        orderedSearchResults.push(searchResults[index])
        addedIndices.add(index)
    }

    return orderedSearchResults
}

class VectaraChain_Chains implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    baseClasses: string[]
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Vectara QA Chain'
        this.name = 'vectaraQAChain'
        this.version = 1.0
        this.type = 'VectaraQAChain'
        this.icon = 'vectara.png'
        this.category = 'Chains'
        this.description = 'QA chain for Vectara'
        this.baseClasses = [this.type, ...getBaseClasses(VectorDBQAChain)]
        this.inputs = [
            {
                label: 'Vectara Store',
                name: 'vectaraStore',
                type: 'VectorStore'
            },
            {
                label: 'Summarizer Prompt Name',
                name: 'summarizerPromptName',
                description:
                    'Summarize the results fetched from Vectara. Read <a target="_blank" href="https://docs.vectara.com/docs/learn/grounded-generation/select-a-summarizer">more</a>',
                type: 'options',
                options: [
                    {
                        label: 'vectara-summary-ext-v1.2.0 (gpt-3.5-turbo)',
                        name: 'vectara-summary-ext-v1.2.0'
                    },
                    {
                        label: 'vectara-experimental-summary-ext-2023-10-23-small (gpt-3.5-turbo)',
                        name: 'vectara-experimental-summary-ext-2023-10-23-small',
                        description: 'In beta, available to both Growth and Scale Vectara users'
                    },
                    {
                        label: 'vectara-summary-ext-v1.3.0 (gpt-4.0)',
                        name: 'vectara-summary-ext-v1.3.0',
                        description: 'Only available to paying Scale Vectara users'
                    },
                    {
                        label: 'vectara-experimental-summary-ext-2023-10-23-med (gpt-4.0)',
                        name: 'vectara-experimental-summary-ext-2023-10-23-med',
                        description: 'In beta, only available to paying Scale Vectara users'
                    }
                ],
                default: 'vectara-summary-ext-v1.2.0'
            },
            {
                label: 'Response Language',
                name: 'responseLang',
                description:
                    'Return the response in specific language. If not selected, Vectara will automatically detects the language. Read <a target="_blank" href="https://docs.vectara.com/docs/learn/grounded-generation/grounded-generation-response-languages">more</a>',
                type: 'options',
                options: [
                    {
                        label: 'English',
                        name: 'eng'
                    },
                    {
                        label: 'German',
                        name: 'deu'
                    },
                    {
                        label: 'French',
                        name: 'fra'
                    },
                    {
                        label: 'Chinese',
                        name: 'zho'
                    },
                    {
                        label: 'Korean',
                        name: 'kor'
                    },
                    {
                        label: 'Arabic',
                        name: 'ara'
                    },
                    {
                        label: 'Russian',
                        name: 'rus'
                    },
                    {
                        label: 'Thai',
                        name: 'tha'
                    },
                    {
                        label: 'Dutch',
                        name: 'nld'
                    },
                    {
                        label: 'Italian',
                        name: 'ita'
                    },
                    {
                        label: 'Portuguese',
                        name: 'por'
                    },
                    {
                        label: 'Spanish',
                        name: 'spa'
                    },
                    {
                        label: 'Japanese',
                        name: 'jpn'
                    },
                    {
                        label: 'Polish',
                        name: 'pol'
                    },
                    {
                        label: 'Turkish',
                        name: 'tur'
                    },
                    {
                        label: 'Vietnamese',
                        name: 'vie'
                    },
                    {
                        label: 'Indonesian',
                        name: 'ind'
                    },
                    {
                        label: 'Czech',
                        name: 'ces'
                    },
                    {
                        label: 'Ukrainian',
                        name: 'ukr'
                    },
                    {
                        label: 'Greek',
                        name: 'ell'
                    },
                    {
                        label: 'Hebrew',
                        name: 'heb'
                    },
                    {
                        label: 'Farsi/Persian',
                        name: 'fas'
                    },
                    {
                        label: 'Hindi',
                        name: 'hin'
                    },
                    {
                        label: 'Urdu',
                        name: 'urd'
                    },
                    {
                        label: 'Swedish',
                        name: 'swe'
                    },
                    {
                        label: 'Bengali',
                        name: 'ben'
                    },
                    {
                        label: 'Malay',
                        name: 'msa'
                    },
                    {
                        label: 'Romanian',
                        name: 'ron'
                    }
                ],
                optional: true,
                default: 'eng'
            },
            {
                label: 'Max Summarized Results',
                name: 'maxSummarizedResults',
                description: 'Maximum results used to build the summarized response',
                type: 'number',
                default: 7
            }
        ]
    }

    async init(): Promise<any> {
        return null
    }

    async run(nodeData: INodeData, input: string): Promise<object> {
        const vectorStore = nodeData.inputs?.vectaraStore as VectaraStore
        const responseLang = (nodeData.inputs?.responseLang as string) ?? 'auto'
        const summarizerPromptName = nodeData.inputs?.summarizerPromptName as string
        const maxSummarizedResultsStr = nodeData.inputs?.maxSummarizedResults as string
        const maxSummarizedResults = maxSummarizedResultsStr ? parseInt(maxSummarizedResultsStr, 10) : 7

        const topK = (vectorStore as any)?.k ?? 10

        const headers = await vectorStore.getJsonHeader()
        const vectaraFilter = (vectorStore as any).vectaraFilter ?? {}
        const corpusId: number[] = (vectorStore as any).corpusId ?? []
        const customerId = (vectorStore as any).customerId ?? ''

        const corpusKeys = corpusId.map((corpusId) => ({
            customerId,
            corpusId,
            metadataFilter: vectaraFilter?.filter ?? '',
            lexicalInterpolationConfig: { lambda: vectaraFilter?.lambda ?? 0.025 }
        }))

        const data = {
            query: [
                {
                    query: input,
                    start: 0,
                    numResults: topK,
                    contextConfig: {
                        sentencesAfter: vectaraFilter?.contextConfig?.sentencesAfter ?? 2,
                        sentencesBefore: vectaraFilter?.contextConfig?.sentencesBefore ?? 2
                    },
                    corpusKey: corpusKeys,
                    summary: [
                        {
                            summarizerPromptName,
                            responseLang,
                            maxSummarizedResults
                        }
                    ]
                }
            ]
        }

        try {
            const response = await fetch(`https://api.vectara.io/v1/query`, {
                method: 'POST',
                headers: headers?.headers,
                body: JSON.stringify(data)
            })

            if (response.status !== 200) {
                throw new Error(`Vectara API returned status code ${response.status}`)
            }

            const result = await response.json()
            const responses = result.responseSet[0].response
            const documents = result.responseSet[0].document
            let rawSummarizedText = ''

            for (let i = 0; i < responses.length; i += 1) {
                const responseMetadata = responses[i].metadata
                const documentMetadata = documents[responses[i].documentIndex].metadata
                const combinedMetadata: Record<string, unknown> = {}

                responseMetadata.forEach((item: { name: string; value: unknown }) => {
                    combinedMetadata[item.name] = item.value
                })

                documentMetadata.forEach((item: { name: string; value: unknown }) => {
                    combinedMetadata[item.name] = item.value
                })

                responses[i].metadata = combinedMetadata
            }

            const summaryStatus = result.responseSet[0].summary[0].status
            if (summaryStatus.length > 0 && summaryStatus[0].code === 'BAD_REQUEST') {
                throw new Error(
                    `BAD REQUEST: Too much text for the summarizer to summarize. Please try reducing the number of search results to summarize, or the context of each result by adjusting the 'summary_num_sentences', and 'summary_num_results' parameters respectively.`
                )
            }

            if (
                summaryStatus.length > 0 &&
                summaryStatus[0].code === 'NOT_FOUND' &&
                summaryStatus[0].statusDetail === 'Failed to retrieve summarizer.'
            ) {
                throw new Error(`BAD REQUEST: summarizer ${summarizerPromptName} is invalid for this account.`)
            }

            rawSummarizedText = result.responseSet[0].summary[0]?.text

            let summarizedText = reorderCitations(rawSummarizedText)
            let summaryResponses = applyCitationOrder(responses, rawSummarizedText)

            const sourceDocuments: Document[] = summaryResponses.map(
                (response: { text: string; metadata: Record<string, unknown>; score: number }) =>
                    new Document({
                        pageContent: response.text,
                        metadata: response.metadata
                    })
            )

            return { text: summarizedText, sourceDocuments: sourceDocuments }
        } catch (error) {
            throw new Error(error)
        }
    }
}

module.exports = { nodeClass: VectaraChain_Chains }
