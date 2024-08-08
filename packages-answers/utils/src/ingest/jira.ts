import { JiraIssue, JiraProject } from 'types'
import chunkArray from '../utilities/chunkArray'

import { EventVersionHandler } from './EventVersionHandler'
import { AnswersFilters, AppSettings } from 'types'
import { jiraAdfToMarkdown } from '../utilities/jiraAdfToMarkdown'

import { Configuration, OpenAIApi } from 'openai'
import { MODELS } from '../MODELS'
import { inngest } from './client'
import { summarizeAI } from '../summarizeAI'
import { getUserClients } from '../auth/getUserClients'

const initializeOpenAI = () => {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY
    })
    return new OpenAIApi(configuration)
}

export const openai = initializeOpenAI()

const JIRA_ISSUE_BATCH_SIZE = 100
const JIRA_PROJECT_BATCH_SIZE = 5
const PINECONE_VECTORS_BATCH_SIZE = 100

export const processJiraUpdated: EventVersionHandler<{
    appSettings: AppSettings
    filters: AnswersFilters
}> = {
    event: 'jira/app.sync',
    v: '1',
    handler: async ({ event, step }) => {
        const {
            user,
            data: { filters, appSettings }
        } = event
        if (!user) throw new Error('User is requierd')
        const { jiraClient } = await getUserClients(user)

        const { datasources: { jira: { project } = { project: [] } } = {} } = filters
        const projectKeysFilter = appSettings?.jira?.projects
            ?.filter((p) => (project?.length ? project?.includes(p.key) : p.enabled))
            ?.map((p) => p.key)
        const projects = await jiraClient.getJiraProjects()

        // Fetch all Jira issues in the configured projects
        await Promise.all(
            chunkArray(
                projects?.filter((project) => projectKeysFilter?.includes(project.key)),
                JIRA_PROJECT_BATCH_SIZE
            ).map(async (batchProjects: JiraProject[], i) =>
                Promise.all(
                    MODELS.jira?.map(async (model) => {
                        const eventData = {
                            _page: i,
                            _batchSize: JIRA_PROJECT_BATCH_SIZE,
                            model,
                            total: projects.length,
                            projectKeys: batchProjects?.map((project) => project.key)
                        }

                        await inngest.send({
                            ts: new Date().valueOf(),
                            name: 'jira/project.sync',
                            data: eventData,
                            user: event.user
                        })
                    })
                )
            )
        )
    }
}

export const procesProjectUpdated: EventVersionHandler<{ projectKeys: string[]; model: string }> = {
    event: 'jira/project.sync',
    v: '1',
    handler: async ({ event, step }) => {
        const { projectKeys, model } = event.data
        const { user } = event
        if (!user) throw new Error('User is requierd')
        const { jiraClient } = await getUserClients(user)

        // Chunk projects into batches of 10
        const issues = await jiraClient.getJiraTickets({
            jql: `project in (${projectKeys?.join(',')})`
        })

        try {
            // @ts-ignore
            await jiraClient.issueLoader.primeAll(issues.map((issue) => [issue.key, issue]))
        } catch (error) {
            console.log('Error priming loader', error)
        }
        // Chunk the issues into batches of JIRA_ISSUE_BATCH_SIZE
        await Promise.all(
            chunkArray(issues, JIRA_ISSUE_BATCH_SIZE).map((batchIssues: JiraIssue[], i) => {
                const eventData = {
                    _page: i,
                    _total: issues.length,
                    _batchSize: JIRA_ISSUE_BATCH_SIZE,
                    model: model,
                    projectKeys,
                    issuesKeys: batchIssues?.map((issue) => issue.key)
                }
                //TODO: Save to Redis by issue key
                //TODO: In event only send issue keys
                inngest.send({
                    v: model,
                    ts: new Date().valueOf(),
                    name: 'jira/issues.upserted',
                    data: eventData,
                    user: event.user
                })
            })
        )
    }
}

export const processUpsertedIssues: EventVersionHandler<{ issuesKeys: string[]; key: string }> = {
    event: 'jira/issues.upserted',
    v: '1',
    handler: async ({ event, step }) => {
        try {
            const {
                user,
                data: { issuesKeys }
            } = event
            if (!user) throw new Error('User is requierd')
            const { jiraClient } = await getUserClients(user)

            const issues = (await jiraClient.issueLoader.loadMany(issuesKeys)) as JiraIssue[]

            // TODO: Create a JiraIssueCommentsLoader
            // or TODO: Pull issue and comments from Prisma
            const jiraIssueComments = await Promise.all(
                issues?.map(async (issue) =>
                    jiraClient
                        .getJiraComments(issue?.id)
                        .then((comments) => ({ ...issue, comments }))
                        .catch((err) => null)
                )
            )

            // TODO: Fix embeddings getting way too big for Pinecone
            // Possible solution is to chunk the comments into multiple embeddings

            const vectors = await Promise.all(
                jiraIssueComments
                    ?.filter((issue) => !!issue)
                    ?.map(async (issue) => {
                        const commentsSummary = await summarizeAI({
                            chunkSize: 7000,
                            maxTokens: 4000,
                            input: issue?.comments
                                ?.map(
                                    ({ author, body, updated, self }: any) =>
                                        `${author?.displayName} commented on ${new Date(updated).toDateString()}: ${jiraAdfToMarkdown(
                                            body
                                        )}`
                                )
                                ?.join('<sep>'),
                            prompt: 'Summarize each comment consicesly (always include dates, action items, and open questions, provide each comment as a list item by the most recent).'
                        })
                        const ticketFields = {
                            source: 'jira',
                            project: issue?.fields.project?.key?.toLowerCase(),
                            account: issue?.fields.customfield_10037?.value?.toLowerCase(),
                            title: issue?.fields?.summary?.toLowerCase(),
                            status_category: issue?.fields.status?.statusCategory?.name?.toLowerCase(),
                            status: issue?.fields.status?.name?.toLowerCase(),
                            assignee: issue?.fields.assignee?.displayName || 'Unassigned'?.toLowerCase(),
                            priority: issue?.fields.priority?.name?.toLowerCase(),
                            reporter: issue?.fields.reporter?.displayName?.toLowerCase(),
                            assignee_email: issue?.fields.assignee?.email?.toLowerCase(),
                            parent_key: issue?.fields.parent?.key?.toLowerCase(),
                            // link: `https://lastrev.atlassian.net/browse/${issue?.key}`?.toLowerCase(),
                            description: (issue?.fields.description
                                ? jiraAdfToMarkdown(issue?.fields.description)?.replaceAll('\n', ' ')
                                : ''
                            )?.toLowerCase(),
                            comments_summary: commentsSummary?.toLowerCase()
                        }
                        const text = `[ticket] [id][id] ${issue?.key?.toLowerCase()} | ${Object.entries(ticketFields)
                            .filter(([_, value]) => !!value)
                            .map(([key, value]) => `[${key}] ${value?.replaceAll('\n', ' ')}`)
                            ?.join(' | ')}`

                        return !!issue
                            ? [
                                  {
                                      source: 'jira',
                                      uid: `JiraIssue_${issue?.key}`,
                                      text,
                                      metadata: ticketFields
                                  }
                              ]
                            : ''
                    })
            ).then((vectors) => vectors.flat())

            if (vectors?.length && vectors?.every((x) => !!x))
                await Promise.all(
                    chunkArray(vectors, PINECONE_VECTORS_BATCH_SIZE).map((batchVectors, i) => {
                        //TODO: Save to Redis by issue key
                        //TODO: In event only send issue keys
                        inngest.send({
                            v: '1',
                            ts: new Date().valueOf(),
                            name: 'pinecone/vectors.upserted',
                            data: {
                                _page: i,
                                _total: vectors.length,
                                _batchSize: PINECONE_VECTORS_BATCH_SIZE,
                                vectors: batchVectors
                            },
                            user: event.user
                        })
                    })
                )
        } catch (e) {
            console.log(e)
            throw e
        }
    }
}
