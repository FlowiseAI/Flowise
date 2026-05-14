import type { Response } from 'node-fetch'
import { secureFetch } from '../../../src/httpSecurity'
import { GetTrendsTool, GetUserTool, SearchTweetsTool, buildXquikUrl, createXquikTools } from './core'

jest.mock('../../../src/httpSecurity', () => ({
    secureFetch: jest.fn()
}))

const mockedSecureFetch = secureFetch as jest.MockedFunction<typeof secureFetch>

describe('Xquik tools', () => {
    beforeEach(() => {
        mockedSecureFetch.mockReset()
    })

    it('creates separate read-only tools for selected actions', () => {
        expect(
            createXquikTools({
                actions: ['searchTweets', 'getUser'],
                apiKey: 'test-key'
            }).map((tool) => tool.name)
        ).toEqual(['xquik_search_tweets', 'xquik_get_user'])
    })

    it('creates all read-only tools when no action is selected', () => {
        expect(createXquikTools({ apiKey: 'test-key' }).map((tool) => tool.name)).toEqual([
            'xquik_search_tweets',
            'xquik_get_tweet',
            'xquik_get_user',
            'xquik_search_users',
            'xquik_list_user_tweets',
            'xquik_get_trends'
        ])
    })

    it('builds Xquik API URLs with encoded search params', () => {
        expect(
            buildXquikUrl('https://xquik.test/api/v1/', '/x/tweets/search', {
                q: 'agent workflows',
                cursor: 'next cursor',
                includeReplies: false
            })
        ).toBe('https://xquik.test/api/v1/x/tweets/search?q=agent+workflows&cursor=next+cursor&includeReplies=false')
    })

    it('returns tweet search results with provenance and rate limit metadata', async () => {
        mockedSecureFetch.mockResolvedValue(
            createResponse(
                {
                    tweets: [
                        {
                            id: '1911111111111111111',
                            text: 'Flowise agent research',
                            createdAt: '2026-05-14T11:00:00.000Z',
                            author: {
                                id: '42',
                                username: 'flowiseai'
                            }
                        }
                    ],
                    has_next_page: true,
                    next_cursor: 'cursor-2'
                },
                {
                    'x-ratelimit-remaining': '88',
                    'x-ratelimit-reset': '1778758800'
                }
            )
        )

        const tool = new SearchTweetsTool({
            apiKey: 'test-key',
            baseUrl: 'https://xquik.test/api/v1',
            maxResults: 5
        })
        const result = JSON.parse(
            await tool._call({
                query: 'Flowise agent research',
                query_type: 'Latest',
                cursor: 'cursor-1'
            })
        )

        expect(mockedSecureFetch).toHaveBeenCalledWith(
            'https://xquik.test/api/v1/x/tweets/search?q=Flowise+agent+research&queryType=Latest&cursor=cursor-1&limit=5',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    accept: 'application/json',
                    'x-api-key': 'test-key'
                })
            })
        )
        expect(result.operation).toBe('search_tweets')
        expect(result.pagination).toEqual({
            has_next_page: true,
            next_cursor: 'cursor-2'
        })
        expect(result.items[0]).toEqual(
            expect.objectContaining({
                source: 'xquik',
                resource_type: 'tweet',
                id: '1911111111111111111',
                url: 'https://x.com/flowiseai/status/1911111111111111111',
                author_id: '42',
                created_at: '2026-05-14T11:00:00.000Z',
                query: 'Flowise agent research',
                rate_limit: {
                    remaining: 88,
                    reset_at: '2026-05-14T11:40:00.000Z'
                }
            })
        )
    })

    it('returns user lookup results with a public profile URL', async () => {
        mockedSecureFetch.mockResolvedValue(
            createResponse({
                id: '783214',
                username: 'xquik_dev',
                name: 'Xquik'
            })
        )

        const tool = new GetUserTool({
            apiKey: 'test-key',
            baseUrl: 'https://xquik.test/api/v1'
        })
        const result = JSON.parse(
            await tool._call({
                user_id: 'xquik_dev'
            })
        )

        expect(mockedSecureFetch).toHaveBeenCalledWith(
            'https://xquik.test/api/v1/x/users/xquik_dev',
            expect.objectContaining({
                method: 'GET'
            })
        )
        expect(result.operation).toBe('get_user')
        expect(result.items[0]).toEqual(
            expect.objectContaining({
                source: 'xquik',
                resource_type: 'user',
                id: '783214',
                url: 'https://x.com/xquik_dev',
                query: 'xquik_dev'
            })
        )
    })

    it('returns trend results with source URLs and requested count', async () => {
        mockedSecureFetch.mockResolvedValue(
            createResponse({
                trends: [
                    {
                        name: 'Flowise',
                        rank: 1,
                        query: 'Flowise'
                    }
                ],
                count: 1,
                woeid: 1
            })
        )

        const tool = new GetTrendsTool({
            apiKey: 'test-key',
            baseUrl: 'https://xquik.test/api/v1'
        })
        const result = JSON.parse(
            await tool._call({
                woeid: 1,
                count: 1
            })
        )

        expect(mockedSecureFetch).toHaveBeenCalledWith(
            'https://xquik.test/api/v1/x/trends?woeid=1&count=1',
            expect.objectContaining({
                method: 'GET'
            })
        )
        expect(result.operation).toBe('get_trends')
        expect(result.items[0]).toEqual(
            expect.objectContaining({
                source: 'xquik',
                resource_type: 'trend',
                id: 'Flowise',
                url: 'https://x.com/search?q=Flowise',
                query: 'woeid:1'
            })
        )
    })

    it('requires query input for tweet searches', async () => {
        const tool = new SearchTweetsTool({
            apiKey: 'test-key',
            baseUrl: 'https://xquik.test/api/v1'
        })

        await expect(
            tool._call({
                query: ''
            })
        ).rejects.toThrow('Xquik query is required for this operation')
        expect(mockedSecureFetch).not.toHaveBeenCalled()
    })
})

function createResponse(body: unknown, headers: Record<string, string> = {}): Response {
    return {
        ok: true,
        status: 200,
        headers: {
            get: (name: string): string | null => headers[name.toLowerCase()] ?? null
        },
        json: async (): Promise<unknown> => body,
        text: async (): Promise<string> => JSON.stringify(body)
    } as unknown as Response
}
