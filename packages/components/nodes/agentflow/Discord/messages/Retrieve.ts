import { INodeParams, INodeData, ICommonObject } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import axios from 'axios'
import { DiscordMessage, DiscordMessagesOutput } from '../types'
import { getErrorMessage, validSnowflakeId } from '../utils'

/**
 * Discord Channel Messages (supporting before, after, around)
 */
class DiscordMessageRetrieve {
    private name: string
    public static mode = 'retrieve'
    public static inputs: INodeParams[] = [
        {
            label: 'Limit',
            name: 'limit',
            type: 'number',
            default: 50,
            description: 'Max messages to retrieve (1–100)',
            show: {
                mode: [DiscordMessageRetrieve.mode]
            }
        },
        {
            label: 'Before Message ID',
            name: 'beforeId',
            type: 'string',
            description: 'Fetch messages **before** this message ID',
            optional: true,
            show: {
                mode: [DiscordMessageRetrieve.mode]
            }
        },
        {
            label: 'After Message ID',
            name: 'afterId',
            type: 'string',
            description: 'Fetch messages **after** this message ID',
            optional: true,
            show: {
                mode: [DiscordMessageRetrieve.mode]
            }
        },
        {
            label: 'Around Message ID',
            name: 'aroundId',
            type: 'string',
            description: 'Fetch messages **around** this message ID (half before/half after; up to `limit`)',
            optional: true,
            show: {
                mode: [DiscordMessageRetrieve.mode]
            }
        }
    ]

    /**
     * Constructor to initialize the node with a name
     * @param name Name of the node
     */
    constructor(name: string) {
        this.name = name
    }

    /**
     * Retrieve messages from a Discord channel
     * @param nodeData Node data containing inputs and credentials
     * @param runId Unique run identifier
     * @param options Additional runtime options
     * @return Promise containing the retrieved messages and metadata
     * @throws Error if credentials or parameters are invalid
     */
    async run(nodeData: INodeData, runId: string, options: ICommonObject): Promise<DiscordMessagesOutput> {
        // 1. Fetch credentials
        const creds = await getCredentialData(nodeData.credential ?? '', options)
        const botToken = getCredentialParam('botToken', creds, nodeData) as string
        const apiVersion = (getCredentialParam('apiVersion', creds, nodeData) as string) || 'v10'
        if (!botToken?.trim()) {
            throw new Error('Bot token is missing from credentials')
        }

        // 2. Read inputs
        const {
            channelId,
            limit,
            beforeId: rawBefore = '',
            afterId: rawAfter = '',
            aroundId: rawAround = ''
        } = nodeData.inputs as Record<string, any>

        // Normalize empty‐string to undefined
        const beforeId = rawBefore?.trim() || undefined
        const afterId = rawAfter?.trim() || undefined
        const aroundId = rawAround?.trim() || undefined

        // 3. Validate mutually exclusive pagination parameters
        const providedParams = [beforeId, afterId, aroundId].filter((p) => p !== undefined)
        if (providedParams.length > 1) {
            throw new Error('Only one of beforeId, afterId, or aroundId may be provided at a time')
        }

        if (!channelId?.trim()) {
            throw new Error('Channel ID is required and cannot be empty')
        }

        if (!validSnowflakeId(channelId.trim())) {
            throw new Error('Channel ID must be a valid Discord snowflake (17-19 digit number)')
        }

        if (beforeId && !validSnowflakeId(beforeId)) {
            throw new Error('Invalid beforeId snowflake')
        }

        if (afterId && !validSnowflakeId(afterId)) {
            throw new Error('Invalid afterId snowflake')
        }

        if (aroundId && !validSnowflakeId(aroundId)) {
            throw new Error('Invalid aroundId snowflake')
        }

        if (limit < 1 || limit > 100) {
            throw new Error('Limit must be between 1 and 100')
        }

        // 4. Build Discord API URL
        let url = `https://discord.com/api/${apiVersion}/channels/${channelId}/messages?limit=${limit}`
        if (beforeId) {
            url += `&before=${beforeId}`
        } else if (afterId) {
            url += `&after=${afterId}`
        } else if (aroundId) {
            url += `&around=${aroundId}`
        }

        // 5. Call Discord’s REST API
        let messages: any[] = []
        try {
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bot ${botToken}`,
                    'Content-Type': 'application/json'
                }
            })
            messages = response.data as DiscordMessage[]
        } catch (err: any) {
            throw new Error(getErrorMessage(err))
        }

        // 6. Return structured output
        return {
            id: nodeData.id,
            name: this.name,
            input: {
                form: { channelId, limit, beforeId, afterId, aroundId }
            },
            output: {
                form: {
                    messages,
                    metadata: {
                        channelId,
                        messageCount: messages.length,
                        fetchedAt: new Date().toISOString(),
                        paginationType: beforeId ? 'before' : afterId ? 'after' : aroundId ? 'around' : 'recent'
                    }
                }
            },
            state: options.agentflowRuntime?.state as ICommonObject
        }
    }
}

export default DiscordMessageRetrieve
