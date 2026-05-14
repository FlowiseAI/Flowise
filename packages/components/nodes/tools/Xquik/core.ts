import { z } from 'zod/v3'
import type { Headers, Response } from 'node-fetch'
import { StructuredTool } from '@langchain/core/tools'
import { secureFetch } from '../../../src/httpSecurity'

const DEFAULT_BASE_URL = 'https://xquik.com/api/v1'
const XQUIK_SOURCE = 'xquik'
const PROVENANCE_DESCRIPTION =
    'Returns JSON with source, resource_type, id, url, retrieved_at, query, rate_limit, and pagination metadata for citation and freshness checks.'

const searchTweetsSchema = z.object({
    query: z.string().describe('Public X/Twitter search query'),
    cursor: z.string().optional().describe('Pagination cursor returned by a previous response'),
    query_type: z.enum(['Top', 'Latest']).optional().describe('Tweet search ordering'),
    max_results: z.number().int().positive().max(100).optional().describe('Maximum tweet results to request')
})

const getTweetSchema = z.object({
    tweet_id: z.string().describe('Tweet ID to fetch')
})

const getUserSchema = z.object({
    user_id: z.string().describe('X user ID or username to fetch')
})

const searchUsersSchema = z.object({
    query: z.string().describe('Public X/Twitter user search query'),
    cursor: z.string().optional().describe('Pagination cursor returned by a previous response')
})

const listUserTweetsSchema = z.object({
    user_id: z.string().describe('X user ID or username whose public tweets should be listed'),
    cursor: z.string().optional().describe('Pagination cursor returned by a previous response'),
    include_replies: z.boolean().optional().describe('Include replies in the user timeline'),
    include_parent_tweet: z.boolean().optional().describe('Include parent tweet context when available')
})

const getTrendsSchema = z.object({
    woeid: z.number().int().positive().optional().describe('Where On Earth ID for trends'),
    count: z.number().int().positive().max(50).optional().describe('Trend count to request')
})

export const XQUIK_ACTIONS = ['searchTweets', 'getTweet', 'getUser', 'searchUsers', 'listUserTweets', 'getTrends'] as const

type XquikAction = (typeof XQUIK_ACTIONS)[number]

type RateLimit = {
    remaining: number | null
    reset_at: string | null
}

type Pagination = {
    has_next_page: boolean | null
    next_cursor: string | null
}

type OperationDefinition = {
    operation: string
    path: string
    resourceType: string
    query: string
    searchParams: Record<string, string | number | boolean | undefined>
}

type XquikToolOptions = {
    apiKey: string
    baseUrl?: string
    description?: string
    maxResults?: number
}

export type CreateXquikToolsOptions = XquikToolOptions & {
    actions?: string[]
}

abstract class BaseXquikTool<TSchema extends z.AnyZodObject> extends StructuredTool {
    abstract schema: TSchema

    protected readonly apiKey: string
    protected readonly baseApiUrl: string
    protected readonly defaultMaxResults: number | undefined
    private readonly extraDescription: string | undefined

    constructor(options: XquikToolOptions) {
        super()
        this.apiKey = options.apiKey
        this.baseApiUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL)
        this.defaultMaxResults = options.maxResults
        this.extraDescription = options.description
    }

    protected buildDescription(defaultDescription: string): string {
        if (!this.extraDescription) {
            return defaultDescription
        }

        return `${defaultDescription}\n\n${this.extraDescription}`
    }

    protected async requestAndFormat(definition: OperationDefinition): Promise<string> {
        const url = buildXquikUrl(this.baseApiUrl, definition.path, definition.searchParams)
        const response = await secureFetch(url, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'x-api-key': this.apiKey
            }
        })

        if (!response.ok) {
            const errorPayload = await readResponsePayload(response)
            const errorMessage = getErrorMessage(errorPayload)
            throw new Error(`Xquik request failed with HTTP ${response.status}${errorMessage ? `: ${errorMessage}` : ''}`)
        }

        const payload = (await response.json()) as unknown
        const retrievedAt = new Date().toISOString()
        const rateLimit = getRateLimit(response.headers)
        const pagination = getPagination(payload)
        const items = getPayloadItems(payload, definition.resourceType).map((item) =>
            addProvenance(item, {
                resourceType: definition.resourceType,
                query: definition.query,
                retrievedAt,
                rateLimit
            })
        )

        return JSON.stringify({
            source: XQUIK_SOURCE,
            operation: definition.operation,
            retrieved_at: retrievedAt,
            rate_limit: rateLimit,
            pagination,
            items
        })
    }
}

export class SearchTweetsTool extends BaseXquikTool<typeof searchTweetsSchema> {
    name = 'xquik_search_tweets'
    description = this.buildDescription(`Search public X/Twitter tweets with Xquik. ${PROVENANCE_DESCRIPTION}`)
    schema = searchTweetsSchema

    async _call(input: z.infer<typeof searchTweetsSchema>): Promise<string> {
        const query = requireInput(input.query, 'query')
        return this.requestAndFormat({
            operation: 'search_tweets',
            path: '/x/tweets/search',
            resourceType: 'tweet',
            query,
            searchParams: {
                q: query,
                queryType: input.query_type,
                cursor: input.cursor,
                limit: input.max_results ?? this.defaultMaxResults
            }
        })
    }
}

export class GetTweetTool extends BaseXquikTool<typeof getTweetSchema> {
    name = 'xquik_get_tweet'
    description = this.buildDescription(`Fetch one public X/Twitter tweet by ID with Xquik. ${PROVENANCE_DESCRIPTION}`)
    schema = getTweetSchema

    async _call(input: z.infer<typeof getTweetSchema>): Promise<string> {
        const tweetId = requireInput(input.tweet_id, 'tweet_id')
        return this.requestAndFormat({
            operation: 'get_tweet',
            path: `/x/tweets/${encodeURIComponent(tweetId)}`,
            resourceType: 'tweet',
            query: tweetId,
            searchParams: {}
        })
    }
}

export class GetUserTool extends BaseXquikTool<typeof getUserSchema> {
    name = 'xquik_get_user'
    description = this.buildDescription(`Fetch one public X/Twitter user by ID or username with Xquik. ${PROVENANCE_DESCRIPTION}`)
    schema = getUserSchema

    async _call(input: z.infer<typeof getUserSchema>): Promise<string> {
        const userId = requireInput(input.user_id, 'user_id')
        return this.requestAndFormat({
            operation: 'get_user',
            path: `/x/users/${encodeURIComponent(userId)}`,
            resourceType: 'user',
            query: userId,
            searchParams: {}
        })
    }
}

export class SearchUsersTool extends BaseXquikTool<typeof searchUsersSchema> {
    name = 'xquik_search_users'
    description = this.buildDescription(`Search public X/Twitter users with Xquik. ${PROVENANCE_DESCRIPTION}`)
    schema = searchUsersSchema

    async _call(input: z.infer<typeof searchUsersSchema>): Promise<string> {
        const query = requireInput(input.query, 'query')
        return this.requestAndFormat({
            operation: 'search_users',
            path: '/x/users/search',
            resourceType: 'user',
            query,
            searchParams: {
                q: query,
                cursor: input.cursor
            }
        })
    }
}

export class ListUserTweetsTool extends BaseXquikTool<typeof listUserTweetsSchema> {
    name = 'xquik_list_user_tweets'
    description = this.buildDescription(`List public tweets for one X/Twitter user with Xquik. ${PROVENANCE_DESCRIPTION}`)
    schema = listUserTweetsSchema

    async _call(input: z.infer<typeof listUserTweetsSchema>): Promise<string> {
        const userId = requireInput(input.user_id, 'user_id')
        return this.requestAndFormat({
            operation: 'list_user_tweets',
            path: `/x/users/${encodeURIComponent(userId)}/tweets`,
            resourceType: 'tweet',
            query: userId,
            searchParams: {
                cursor: input.cursor,
                includeReplies: input.include_replies,
                includeParentTweet: input.include_parent_tweet
            }
        })
    }
}

export class GetTrendsTool extends BaseXquikTool<typeof getTrendsSchema> {
    name = 'xquik_get_trends'
    description = this.buildDescription(`Fetch public X/Twitter trends with Xquik. ${PROVENANCE_DESCRIPTION}`)
    schema = getTrendsSchema

    async _call(input: z.infer<typeof getTrendsSchema>): Promise<string> {
        return this.requestAndFormat({
            operation: 'get_trends',
            path: '/x/trends',
            resourceType: 'trend',
            query: input.woeid ? `woeid:${input.woeid}` : 'global',
            searchParams: {
                woeid: input.woeid,
                count: input.count
            }
        })
    }
}

export type XquikTool = SearchTweetsTool | GetTweetTool | GetUserTool | SearchUsersTool | ListUserTweetsTool | GetTrendsTool

export function createXquikTools(options: CreateXquikToolsOptions): XquikTool[] {
    const actions = getSelectedActions(options.actions)
    const tools: XquikTool[] = []

    if (actions.includes('searchTweets')) {
        tools.push(new SearchTweetsTool(options))
    }

    if (actions.includes('getTweet')) {
        tools.push(new GetTweetTool(options))
    }

    if (actions.includes('getUser')) {
        tools.push(new GetUserTool(options))
    }

    if (actions.includes('searchUsers')) {
        tools.push(new SearchUsersTool(options))
    }

    if (actions.includes('listUserTweets')) {
        tools.push(new ListUserTweetsTool(options))
    }

    if (actions.includes('getTrends')) {
        tools.push(new GetTrendsTool(options))
    }

    return tools
}

function getSelectedActions(actions: string[] | undefined): XquikAction[] {
    if (!actions || actions.length === 0) {
        return [...XQUIK_ACTIONS]
    }

    return actions.filter((action): action is XquikAction => XQUIK_ACTIONS.includes(action as XquikAction))
}

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '')
}

export function buildXquikUrl(baseUrl: string, path: string, searchParams: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${normalizeBaseUrl(baseUrl)}${path}`)

    for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined) {
            url.searchParams.set(key, String(value))
        }
    }

    return url.toString()
}

function requireInput(value: string | undefined, field: string): string {
    if (!value) {
        throw new Error(`Xquik ${field} is required for this operation`)
    }

    return value
}

async function readResponsePayload(response: Response): Promise<unknown> {
    try {
        return await response.json()
    } catch {
        try {
            return await response.text()
        } catch {
            return undefined
        }
    }
}

function getErrorMessage(payload: unknown): string | null {
    if (typeof payload === 'string') {
        return payload
    }

    const record = asRecord(payload)
    return getString(record, ['error', 'message', 'detail'])
}

function getRateLimit(headers: Headers): RateLimit {
    const remaining = headers.get('x-ratelimit-remaining') ?? headers.get('ratelimit-remaining')
    const reset = headers.get('x-ratelimit-reset') ?? headers.get('ratelimit-reset')

    return {
        remaining: parseNumber(remaining),
        reset_at: parseResetAt(reset)
    }
}

function parseNumber(value: string | null): number | null {
    if (!value) {
        return null
    }

    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
}

function parseResetAt(value: string | null): string | null {
    if (!value) {
        return null
    }

    const numericValue = Number(value)
    if (Number.isFinite(numericValue)) {
        return new Date(numericValue * 1000).toISOString()
    }

    return value
}

function getPagination(payload: unknown): Pagination {
    const record = asRecord(payload)

    return {
        has_next_page: getBoolean(record, ['has_next_page', 'hasNextPage']),
        next_cursor: getString(record, ['next_cursor', 'nextCursor'])
    }
}

function getPayloadItems(payload: unknown, resourceType: string): Record<string, unknown>[] {
    const record = asRecord(payload)
    const collectionKeys = getCollectionKeys(resourceType)

    for (const key of collectionKeys) {
        const value = record[key]
        if (Array.isArray(value)) {
            return value.map(asRecord)
        }
    }

    if (Object.keys(record).length > 0) {
        return [record]
    }

    return []
}

function getCollectionKeys(resourceType: string): string[] {
    if (resourceType === 'tweet') {
        return ['tweets', 'data', 'items', 'results']
    }

    if (resourceType === 'user') {
        return ['users', 'data', 'items', 'results']
    }

    return ['trends', 'data', 'items', 'results']
}

function addProvenance(
    item: Record<string, unknown>,
    options: {
        resourceType: string
        query: string
        retrievedAt: string
        rateLimit: RateLimit
    }
): Record<string, unknown> {
    const id = getResourceId(item, options.resourceType)

    return {
        ...item,
        source: XQUIK_SOURCE,
        resource_type: options.resourceType,
        id,
        url: getResourceUrl(item, options.resourceType, id),
        author_id: getAuthorId(item),
        created_at: getString(item, ['created_at', 'createdAt', 'date']),
        retrieved_at: options.retrievedAt,
        query: options.query,
        rate_limit: options.rateLimit
    }
}

function getResourceId(item: Record<string, unknown>, resourceType: string): string | null {
    const id = getString(item, ['id', 'tweet_id', 'tweetId', 'user_id', 'userId'])

    if (id) {
        return id
    }

    if (resourceType === 'trend') {
        return getString(item, ['name', 'query'])
    }

    return null
}

function getAuthorId(item: Record<string, unknown>): string | null {
    const directAuthorId = getString(item, ['author_id', 'authorId', 'user_id', 'userId'])
    if (directAuthorId) {
        return directAuthorId
    }

    return getString(asRecord(item.author), ['id', 'user_id', 'userId'])
}

function getResourceUrl(item: Record<string, unknown>, resourceType: string, id: string | null): string | null {
    if (resourceType === 'user') {
        const username = getString(item, ['username', 'screen_name', 'screenName'])
        return username ? `https://x.com/${username}` : null
    }

    if (resourceType === 'trend') {
        const query = getString(item, ['query', 'name'])
        return query ? `https://x.com/search?q=${encodeURIComponent(query)}` : null
    }

    const directUrl = getString(item, ['url', 'tweet_url', 'tweetUrl'])
    if (directUrl) {
        return directUrl
    }

    const author = asRecord(item.author)
    const username = getString(author, ['username', 'screen_name', 'screenName'])
    if (username && id) {
        return `https://x.com/${username}/status/${id}`
    }

    return id ? `https://x.com/i/web/status/${id}` : null
}

function asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>
    }

    return {}
}

function getString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = record[key]
        if (typeof value === 'string' && value.length > 0) {
            return value
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value)
        }
    }

    return null
}

function getBoolean(record: Record<string, unknown>, keys: string[]): boolean | null {
    for (const key of keys) {
        const value = record[key]
        if (typeof value === 'boolean') {
            return value
        }
    }

    return null
}
