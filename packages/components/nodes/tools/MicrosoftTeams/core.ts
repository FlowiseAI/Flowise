import { z } from 'zod'
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager'
import { DynamicStructuredTool, DynamicStructuredToolInput } from '../OpenAPIToolkit/core'
import { TOOL_ARGS_PREFIX } from '../../../src/agents'

interface TeamsToolOptions {
    accessToken: string
    actions: string[]
    defaultParams: any
    type: string
}

const BASE_URL = 'https://graph.microsoft.com/v1.0'

// Helper function to make Graph API requests
async function makeGraphRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any,
    accessToken?: string
): Promise<any> {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    }

    const config: RequestInit = {
        method,
        headers
    }

    if (body && (method === 'POST' || method === 'PATCH')) {
        config.body = JSON.stringify(body)
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, config)

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText} - ${errorText}`)
        }

        // Handle empty responses for DELETE operations
        if (method === 'DELETE' || response.status === 204) {
            return { success: true, message: 'Operation completed successfully' }
        }

        return await response.json()
    } catch (error) {
        throw new Error(`Microsoft Graph request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

// Base Teams Tool class
abstract class BaseTeamsTool extends DynamicStructuredTool {
    accessToken = ''
    protected defaultParams: any

    constructor(args: DynamicStructuredToolInput<any> & { accessToken?: string; defaultParams?: any }) {
        super(args)
        this.accessToken = args.accessToken ?? ''
        this.defaultParams = args.defaultParams || {}
    }

    protected async makeTeamsRequest(endpoint: string, method: string = 'GET', body?: any) {
        return await makeGraphRequest(endpoint, method as any, body, this.accessToken)
    }

    protected formatResponse(data: any, params: any): string {
        return JSON.stringify(data) + TOOL_ARGS_PREFIX + JSON.stringify(params)
    }

    // Abstract method that must be implemented by subclasses
    protected abstract _call(arg: any, runManager?: CallbackManagerForToolRun, parentConfig?: any): Promise<string>
}

// CHANNEL TOOLS

class ListChannelsTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'list_channels',
            description: 'List all channels in a team',
            schema: z.object({
                teamId: z.string().describe('ID of the team to list channels from'),
                maxResults: z.number().optional().default(50).describe('Maximum number of channels to return')
            }),
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { teamId, maxResults = 50 } = params

        if (!teamId) {
            throw new Error('Team ID is required to list channels')
        }

        try {
            const endpoint = `/teams/${teamId}/channels`
            const result = await this.makeTeamsRequest(endpoint)

            // Filter results to maxResults on client side since $top is not supported
            const channels = result.value || []
            const limitedChannels = channels.slice(0, maxResults)

            const responseData = {
                success: true,
                channels: limitedChannels,
                count: limitedChannels.length,
                total: channels.length
            }

            return this.formatResponse(responseData, params)
        } catch (error) {
            return this.formatResponse(`Error listing channels: ${error}`, params)
        }
    }
}

class GetChannelTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'get_channel',
            description: 'Get details of a specific channel',
            schema: z.object({
                teamId: z.string().describe('ID of the team that contains the channel'),
                channelId: z.string().describe('ID of the channel to retrieve')
            }),
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { teamId, channelId } = params

        if (!teamId || !channelId) {
            throw new Error('Both Team ID and Channel ID are required')
        }

        try {
            const endpoint = `/teams/${teamId}/channels/${channelId}`
            const result = await this.makeTeamsRequest(endpoint)

            return this.formatResponse(
                {
                    success: true,
                    channel: result
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error getting channel: ${error}`, params)
        }
    }
}

class CreateChannelTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'create_channel',
            description: 'Create a new channel in a team',
            schema: z.object({
                teamId: z.string().describe('ID of the team to create the channel in'),
                displayName: z.string().describe('Display name of the channel'),
                description: z.string().optional().describe('Description of the channel'),
                membershipType: z
                    .enum(['standard', 'private', 'shared'])
                    .optional()
                    .default('standard')
                    .describe('Type of channel membership')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { teamId, displayName, description, membershipType = 'standard' } = params

        if (!teamId || !displayName) {
            throw new Error('Team ID and Display Name are required to create a channel')
        }

        try {
            const body = {
                displayName,
                membershipType,
                ...(description && { description })
            }

            const endpoint = `/teams/${teamId}/channels`
            const result = await this.makeTeamsRequest(endpoint, 'POST', body)

            return this.formatResponse(
                {
                    success: true,
                    channel: result,
                    message: `Channel "${displayName}" created successfully`
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error creating channel: ${error}`, params)
        }
    }
}

class UpdateChannelTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'update_channel',
            description: 'Update an existing channel',
            schema: z.object({
                teamId: z.string().describe('ID of the team that contains the channel'),
                channelId: z.string().describe('ID of the channel to update'),
                displayName: z.string().optional().describe('New display name of the channel'),
                description: z.string().optional().describe('New description of the channel')
            }),
            baseUrl: BASE_URL,
            method: 'PATCH',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { teamId, channelId, displayName, description } = params

        if (!teamId || !channelId) {
            throw new Error('Both Team ID and Channel ID are required')
        }

        try {
            const body: any = {}
            if (displayName) body.displayName = displayName
            if (description) body.description = description

            if (Object.keys(body).length === 0) {
                throw new Error('At least one field to update must be provided')
            }

            const endpoint = `/teams/${teamId}/channels/${channelId}`
            await this.makeTeamsRequest(endpoint, 'PATCH', body)

            return this.formatResponse(
                {
                    success: true,
                    message: 'Channel updated successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error updating channel: ${error}`, params)
        }
    }
}

class DeleteChannelTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'delete_channel',
            description: 'Delete a channel from a team',
            schema: z.object({
                teamId: z.string().describe('ID of the team that contains the channel'),
                channelId: z.string().describe('ID of the channel to delete')
            }),
            baseUrl: BASE_URL,
            method: 'DELETE',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { teamId, channelId } = params

        if (!teamId || !channelId) {
            throw new Error('Both Team ID and Channel ID are required')
        }

        try {
            const endpoint = `/teams/${teamId}/channels/${channelId}`
            await this.makeTeamsRequest(endpoint, 'DELETE')

            return this.formatResponse(
                {
                    success: true,
                    message: 'Channel deleted successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error deleting channel: ${error}`, params)
        }
    }
}

class ArchiveChannelTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'archive_channel',
            description: 'Archive a channel in a team',
            schema: z.object({
                teamId: z.string().describe('ID of the team that contains the channel'),
                channelId: z.string().describe('ID of the channel to archive')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { teamId, channelId } = params

        if (!teamId || !channelId) {
            throw new Error('Both Team ID and Channel ID are required')
        }

        try {
            const endpoint = `/teams/${teamId}/channels/${channelId}/archive`
            await this.makeTeamsRequest(endpoint, 'POST', {})

            return this.formatResponse(
                {
                    success: true,
                    message: 'Channel archived successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error archiving channel: ${error}`, params)
        }
    }
}

class UnarchiveChannelTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'unarchive_channel',
            description: 'Unarchive a channel in a team',
            schema: z.object({
                teamId: z.string().describe('ID of the team that contains the channel'),
                channelId: z.string().describe('ID of the channel to unarchive')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { teamId, channelId } = params

        if (!teamId || !channelId) {
            throw new Error('Both Team ID and Channel ID are required')
        }

        try {
            const endpoint = `/teams/${teamId}/channels/${channelId}/unarchive`
            await this.makeTeamsRequest(endpoint, 'POST', {})

            return this.formatResponse(
                {
                    success: true,
                    message: 'Channel unarchived successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error unarchiving channel: ${error}`, params)
        }
    }
}

class ListChannelMembersTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'list_channel_members',
            description: 'List members of a channel',
            schema: z.object({
                teamId: z.string().describe('ID of the team that contains the channel'),
                channelId: z.string().describe('ID of the channel')
            }),
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { teamId, channelId } = params

        if (!teamId || !channelId) {
            throw new Error('Both Team ID and Channel ID are required')
        }

        try {
            const endpoint = `/teams/${teamId}/channels/${channelId}/members`
            const result = await this.makeTeamsRequest(endpoint)

            return this.formatResponse(
                {
                    success: true,
                    members: result.value || [],
                    count: result.value?.length || 0
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error listing channel members: ${error}`, params)
        }
    }
}

class AddChannelMemberTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'add_channel_member',
            description: 'Add a member to a channel',
            schema: z.object({
                teamId: z.string().describe('ID of the team that contains the channel'),
                channelId: z.string().describe('ID of the channel'),
                userId: z.string().describe('ID of the user to add')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { teamId, channelId, userId } = params

        if (!teamId || !channelId || !userId) {
            throw new Error('Team ID, Channel ID, and User ID are all required')
        }

        try {
            const body = {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`
            }

            const endpoint = `/teams/${teamId}/channels/${channelId}/members`
            await this.makeTeamsRequest(endpoint, 'POST', body)

            return this.formatResponse(
                {
                    success: true,
                    message: 'Member added to channel successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error adding channel member: ${error}`, params)
        }
    }
}

class RemoveChannelMemberTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'remove_channel_member',
            description: 'Remove a member from a channel',
            schema: z.object({
                teamId: z.string().describe('ID of the team that contains the channel'),
                channelId: z.string().describe('ID of the channel'),
                userId: z.string().describe('ID of the user to remove')
            }),
            baseUrl: BASE_URL,
            method: 'DELETE',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { teamId, channelId, userId } = params

        if (!teamId || !channelId || !userId) {
            throw new Error('Team ID, Channel ID, and User ID are all required')
        }

        try {
            // First get the membership ID
            const membersEndpoint = `/teams/${teamId}/channels/${channelId}/members`
            const membersResult = await this.makeTeamsRequest(membersEndpoint)

            const member = membersResult.value?.find((m: any) => m.userId === userId)
            if (!member) {
                throw new Error('User is not a member of this channel')
            }

            const endpoint = `/teams/${teamId}/channels/${channelId}/members/${member.id}`
            await this.makeTeamsRequest(endpoint, 'DELETE')

            return this.formatResponse(
                {
                    success: true,
                    message: 'Member removed from channel successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error removing channel member: ${error}`, params)
        }
    }
}

// CHAT TOOLS

class ListChatsTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'list_chats',
            description: 'List all chats for the current user',
            schema: z.object({
                maxResults: z.number().optional().default(50).describe('Maximum number of chats to return')
            }),
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { maxResults = 50 } = params

        try {
            const endpoint = `/me/chats?$top=${maxResults}`
            const result = await this.makeTeamsRequest(endpoint)

            return this.formatResponse(
                {
                    success: true,
                    chats: result.value || [],
                    count: result.value?.length || 0
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error listing chats: ${error}`, params)
        }
    }
}

class GetChatTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'get_chat',
            description: 'Get details of a specific chat',
            schema: z.object({
                chatId: z.string().describe('ID of the chat to retrieve')
            }),
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatId } = params

        if (!chatId) {
            throw new Error('Chat ID is required')
        }

        try {
            const endpoint = `/chats/${chatId}`
            const result = await this.makeTeamsRequest(endpoint)

            return this.formatResponse(
                {
                    success: true,
                    chat: result
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error getting chat: ${error}`, params)
        }
    }
}

class CreateChatTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'create_chat',
            description: 'Create a new chat',
            schema: z.object({
                chatType: z.enum(['oneOnOne', 'group']).optional().default('group').describe('Type of chat to create'),
                topic: z.string().optional().describe('Topic/subject of the chat (for group chats)'),
                members: z.string().describe('Comma-separated list of user IDs to add to the chat')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatType = 'group', topic, members } = params

        if (!members) {
            throw new Error('Members list is required to create a chat')
        }

        try {
            const memberIds = members.split(',').map((id: string) => id.trim())
            const chatMembers = memberIds.map((userId: string) => ({
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`
            }))

            const body: any = {
                chatType,
                members: chatMembers
            }

            if (topic && chatType === 'group') {
                body.topic = topic
            }

            const endpoint = '/chats'
            const result = await this.makeTeamsRequest(endpoint, 'POST', body)

            return this.formatResponse(
                {
                    success: true,
                    chat: result,
                    message: 'Chat created successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error creating chat: ${error}`, params)
        }
    }
}

class UpdateChatTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'update_chat',
            description: 'Update an existing chat',
            schema: z.object({
                chatId: z.string().describe('ID of the chat to update'),
                topic: z.string().describe('New topic/subject of the chat')
            }),
            baseUrl: BASE_URL,
            method: 'PATCH',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatId, topic } = params

        if (!chatId) {
            throw new Error('Chat ID is required')
        }

        if (!topic) {
            throw new Error('Topic is required to update a chat')
        }

        try {
            const body = { topic }
            const endpoint = `/chats/${chatId}`
            await this.makeTeamsRequest(endpoint, 'PATCH', body)

            return this.formatResponse(
                {
                    success: true,
                    message: 'Chat updated successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error updating chat: ${error}`, params)
        }
    }
}

class DeleteChatTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'delete_chat',
            description: 'Delete a chat',
            schema: z.object({
                chatId: z.string().describe('ID of the chat to delete')
            }),
            baseUrl: BASE_URL,
            method: 'DELETE',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatId } = params

        if (!chatId) {
            throw new Error('Chat ID is required')
        }

        try {
            const endpoint = `/chats/${chatId}`
            await this.makeTeamsRequest(endpoint, 'DELETE')

            return this.formatResponse(
                {
                    success: true,
                    message: 'Chat deleted successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error deleting chat: ${error}`, params)
        }
    }
}

class ListChatMembersTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'list_chat_members',
            description: 'List members of a chat',
            schema: z.object({
                chatId: z.string().describe('ID of the chat')
            }),
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatId } = params

        if (!chatId) {
            throw new Error('Chat ID is required')
        }

        try {
            const endpoint = `/chats/${chatId}/members`
            const result = await this.makeTeamsRequest(endpoint)

            return this.formatResponse(
                {
                    success: true,
                    members: result.value || [],
                    count: result.value?.length || 0
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error listing chat members: ${error}`, params)
        }
    }
}

class AddChatMemberTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'add_chat_member',
            description: 'Add a member to a chat',
            schema: z.object({
                chatId: z.string().describe('ID of the chat'),
                userId: z.string().describe('ID of the user to add')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatId, userId } = params

        if (!chatId || !userId) {
            throw new Error('Both Chat ID and User ID are required')
        }

        try {
            const body = {
                '@odata.type': '#microsoft.graph.aadUserConversationMember',
                'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`
            }

            const endpoint = `/chats/${chatId}/members`
            await this.makeTeamsRequest(endpoint, 'POST', body)

            return this.formatResponse(
                {
                    success: true,
                    message: 'Member added to chat successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error adding chat member: ${error}`, params)
        }
    }
}

class RemoveChatMemberTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'remove_chat_member',
            description: 'Remove a member from a chat',
            schema: z.object({
                chatId: z.string().describe('ID of the chat'),
                userId: z.string().describe('ID of the user to remove')
            }),
            baseUrl: BASE_URL,
            method: 'DELETE',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatId, userId } = params

        if (!chatId || !userId) {
            throw new Error('Both Chat ID and User ID are required')
        }

        try {
            // First get the membership ID
            const membersEndpoint = `/chats/${chatId}/members`
            const membersResult = await this.makeTeamsRequest(membersEndpoint)

            const member = membersResult.value?.find((m: any) => m.userId === userId)
            if (!member) {
                throw new Error('User is not a member of this chat')
            }

            const endpoint = `/chats/${chatId}/members/${member.id}`
            await this.makeTeamsRequest(endpoint, 'DELETE')

            return this.formatResponse(
                {
                    success: true,
                    message: 'Member removed from chat successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error removing chat member: ${error}`, params)
        }
    }
}

class PinMessageTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'pin_message',
            description: 'Pin a message in a chat',
            schema: z.object({
                chatId: z.string().describe('ID of the chat'),
                messageId: z.string().describe('ID of the message to pin')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatId, messageId } = params

        if (!chatId || !messageId) {
            throw new Error('Both Chat ID and Message ID are required')
        }

        try {
            const body = {
                message: {
                    '@odata.bind': `https://graph.microsoft.com/v1.0/chats('${chatId}')/messages('${messageId}')`
                }
            }

            const endpoint = `/chats/${chatId}/pinnedMessages`
            await this.makeTeamsRequest(endpoint, 'POST', body)

            return this.formatResponse(
                {
                    success: true,
                    message: 'Message pinned successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error pinning message: ${error}`, params)
        }
    }
}

class UnpinMessageTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'unpin_message',
            description: 'Unpin a message from a chat',
            schema: z.object({
                chatId: z.string().describe('ID of the chat'),
                messageId: z.string().describe('ID of the message to unpin')
            }),
            baseUrl: BASE_URL,
            method: 'DELETE',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatId, messageId } = params

        if (!chatId || !messageId) {
            throw new Error('Both Chat ID and Message ID are required')
        }

        try {
            // First get the pinned messages to find the pinned message ID
            const pinnedEndpoint = `/chats/${chatId}/pinnedMessages`
            const pinnedResult = await this.makeTeamsRequest(pinnedEndpoint)

            const pinnedMessage = pinnedResult.value?.find((pm: any) => pm.message?.id === messageId)
            if (!pinnedMessage) {
                throw new Error('Message is not pinned in this chat')
            }

            const endpoint = `/chats/${chatId}/pinnedMessages/${pinnedMessage.id}`
            await this.makeTeamsRequest(endpoint, 'DELETE')

            return this.formatResponse(
                {
                    success: true,
                    message: 'Message unpinned successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error unpinning message: ${error}`, params)
        }
    }
}

// CHAT MESSAGE TOOLS

class ListMessagesTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'list_messages',
            description: 'List messages in a chat or channel',
            schema: z.object({
                chatChannelId: z.string().describe('ID of the chat or channel to list messages from'),
                teamId: z.string().optional().describe('ID of the team (required for channel messages)'),
                maxResults: z.number().optional().default(50).describe('Maximum number of messages to return')
            }),
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatChannelId, teamId, maxResults = 50 } = params

        if (!chatChannelId) {
            throw new Error('Chat or Channel ID is required')
        }

        try {
            let endpoint: string
            if (teamId) {
                // Channel messages
                endpoint = `/teams/${teamId}/channels/${chatChannelId}/messages?$top=${maxResults}`
            } else {
                // Chat messages
                endpoint = `/chats/${chatChannelId}/messages?$top=${maxResults}`
            }

            const result = await this.makeTeamsRequest(endpoint)

            return this.formatResponse(
                {
                    success: true,
                    messages: result.value || [],
                    count: result.value?.length || 0,
                    context: teamId ? 'channel' : 'chat'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error listing messages: ${error}`, params)
        }
    }
}

class GetMessageTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'get_message',
            description: 'Get details of a specific message',
            schema: z.object({
                chatChannelId: z.string().describe('ID of the chat or channel'),
                teamId: z.string().optional().describe('ID of the team (required for channel messages)'),
                messageId: z.string().describe('ID of the message to retrieve')
            }),
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatChannelId, teamId, messageId } = params

        if (!chatChannelId || !messageId) {
            throw new Error('Chat/Channel ID and Message ID are required')
        }

        try {
            let endpoint: string
            if (teamId) {
                // Channel message
                endpoint = `/teams/${teamId}/channels/${chatChannelId}/messages/${messageId}`
            } else {
                // Chat message
                endpoint = `/chats/${chatChannelId}/messages/${messageId}`
            }

            const result = await this.makeTeamsRequest(endpoint)

            return this.formatResponse(
                {
                    success: true,
                    message: result,
                    context: teamId ? 'channel' : 'chat'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error getting message: ${error}`, params)
        }
    }
}

class SendMessageTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'send_message',
            description: 'Send a message to a chat or channel',
            schema: z.object({
                chatChannelId: z.string().describe('ID of the chat or channel to send message to'),
                teamId: z.string().optional().describe('ID of the team (required for channel messages)'),
                messageBody: z.string().describe('Content of the message'),
                contentType: z.enum(['text', 'html']).optional().default('text').describe('Content type of the message')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatChannelId, teamId, messageBody, contentType = 'text' } = params

        if (!chatChannelId || !messageBody) {
            throw new Error('Chat/Channel ID and Message Body are required')
        }

        try {
            const body = {
                body: {
                    contentType,
                    content: messageBody
                }
            }

            let endpoint: string
            if (teamId) {
                // Channel message
                endpoint = `/teams/${teamId}/channels/${chatChannelId}/messages`
            } else {
                // Chat message
                endpoint = `/chats/${chatChannelId}/messages`
            }

            const result = await this.makeTeamsRequest(endpoint, 'POST', body)

            return this.formatResponse(
                {
                    success: true,
                    message: result,
                    context: teamId ? 'channel' : 'chat',
                    messageText: 'Message sent successfully'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error sending message: ${error}`, params)
        }
    }
}

class UpdateMessageTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'update_message',
            description: 'Update an existing message',
            schema: z.object({
                chatChannelId: z.string().describe('ID of the chat or channel'),
                teamId: z.string().optional().describe('ID of the team (required for channel messages)'),
                messageId: z.string().describe('ID of the message to update')
            }),
            baseUrl: BASE_URL,
            method: 'PATCH',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatChannelId, teamId, messageId } = params

        if (!chatChannelId || !messageId) {
            throw new Error('Chat/Channel ID and Message ID are required')
        }

        try {
            // Note: Message update is primarily for policy violations in Teams
            const body = {
                policyViolation: null
            }

            let endpoint: string
            if (teamId) {
                // Channel message
                endpoint = `/teams/${teamId}/channels/${chatChannelId}/messages/${messageId}`
            } else {
                // Chat message
                endpoint = `/chats/${chatChannelId}/messages/${messageId}`
            }

            await this.makeTeamsRequest(endpoint, 'PATCH', body)

            return this.formatResponse(
                {
                    success: true,
                    message: 'Message updated successfully',
                    context: teamId ? 'channel' : 'chat'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error updating message: ${error}`, params)
        }
    }
}

class DeleteMessageTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'delete_message',
            description: 'Delete a message',
            schema: z.object({
                chatChannelId: z.string().describe('ID of the chat or channel'),
                teamId: z.string().optional().describe('ID of the team (required for channel messages)'),
                messageId: z.string().describe('ID of the message to delete')
            }),
            baseUrl: BASE_URL,
            method: 'DELETE',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatChannelId, teamId, messageId } = params

        if (!chatChannelId || !messageId) {
            throw new Error('Chat/Channel ID and Message ID are required')
        }

        try {
            let endpoint: string
            if (teamId) {
                // Channel message - use soft delete
                endpoint = `/teams/${teamId}/channels/${chatChannelId}/messages/${messageId}/softDelete`
            } else {
                // Chat message - use soft delete
                endpoint = `/chats/${chatChannelId}/messages/${messageId}/softDelete`
            }

            await this.makeTeamsRequest(endpoint, 'POST', {})

            return this.formatResponse(
                {
                    success: true,
                    message: 'Message deleted successfully',
                    context: teamId ? 'channel' : 'chat'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error deleting message: ${error}`, params)
        }
    }
}

class ReplyToMessageTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'reply_to_message',
            description: 'Reply to a message in a chat or channel',
            schema: z.object({
                chatChannelId: z.string().describe('ID of the chat or channel'),
                teamId: z.string().optional().describe('ID of the team (required for channel messages)'),
                messageId: z.string().describe('ID of the message to reply to'),
                replyBody: z.string().describe('Content of the reply'),
                contentType: z.enum(['text', 'html']).optional().default('text').describe('Content type of the reply')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatChannelId, teamId, messageId, replyBody, contentType = 'text' } = params

        if (!chatChannelId || !messageId || !replyBody) {
            throw new Error('Chat/Channel ID, Message ID, and Reply Body are required')
        }

        try {
            const body = {
                body: {
                    contentType,
                    content: replyBody
                }
            }

            let endpoint: string
            if (teamId) {
                // Channel message reply
                endpoint = `/teams/${teamId}/channels/${chatChannelId}/messages/${messageId}/replies`
            } else {
                // For chat messages, replies are just new messages
                endpoint = `/chats/${chatChannelId}/messages`
            }

            const result = await this.makeTeamsRequest(endpoint, 'POST', body)

            return this.formatResponse(
                {
                    success: true,
                    reply: result,
                    message: 'Reply sent successfully',
                    context: teamId ? 'channel' : 'chat'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error replying to message: ${error}`, params)
        }
    }
}

class SetReactionTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'set_reaction',
            description: 'Set a reaction to a message',
            schema: z.object({
                chatChannelId: z.string().describe('ID of the chat or channel'),
                teamId: z.string().optional().describe('ID of the team (required for channel messages)'),
                messageId: z.string().describe('ID of the message to react to'),
                reactionType: z
                    .enum(['like', 'heart', 'laugh', 'surprised', 'sad', 'angry'])
                    .optional()
                    .default('like')
                    .describe('Type of reaction to set')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatChannelId, teamId, messageId, reactionType = 'like' } = params

        if (!chatChannelId || !messageId) {
            throw new Error('Chat/Channel ID and Message ID are required')
        }

        try {
            let endpoint: string
            if (teamId) {
                // Channel message
                endpoint = `/teams/${teamId}/channels/${chatChannelId}/messages/${messageId}/setReaction`
            } else {
                // Chat message
                endpoint = `/chats/${chatChannelId}/messages/${messageId}/setReaction`
            }

            const body = {
                reactionType
            }

            await this.makeTeamsRequest(endpoint, 'POST', body)

            return this.formatResponse(
                {
                    success: true,
                    message: `Reaction "${reactionType}" set successfully`,
                    context: teamId ? 'channel' : 'chat'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error setting reaction: ${error}`, params)
        }
    }
}

class UnsetReactionTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'unset_reaction',
            description: 'Remove a reaction from a message',
            schema: z.object({
                chatChannelId: z.string().describe('ID of the chat or channel'),
                teamId: z.string().optional().describe('ID of the team (required for channel messages)'),
                messageId: z.string().describe('ID of the message to remove reaction from'),
                reactionType: z
                    .enum(['like', 'heart', 'laugh', 'surprised', 'sad', 'angry'])
                    .optional()
                    .default('like')
                    .describe('Type of reaction to remove')
            }),
            baseUrl: BASE_URL,
            method: 'POST',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { chatChannelId, teamId, messageId, reactionType = 'like' } = params

        if (!chatChannelId || !messageId) {
            throw new Error('Chat/Channel ID and Message ID are required')
        }

        try {
            let endpoint: string
            if (teamId) {
                // Channel message
                endpoint = `/teams/${teamId}/channels/${chatChannelId}/messages/${messageId}/unsetReaction`
            } else {
                // Chat message
                endpoint = `/chats/${chatChannelId}/messages/${messageId}/unsetReaction`
            }

            const body = {
                reactionType
            }

            await this.makeTeamsRequest(endpoint, 'POST', body)

            return this.formatResponse(
                {
                    success: true,
                    message: `Reaction "${reactionType}" removed successfully`,
                    context: teamId ? 'channel' : 'chat'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error unsetting reaction: ${error}`, params)
        }
    }
}

class GetAllMessagesTool extends BaseTeamsTool {
    constructor(args: { accessToken?: string; defaultParams?: any }) {
        const toolInput: DynamicStructuredToolInput<any> = {
            name: 'get_all_messages',
            description: 'Get messages across all chats and channels for the user',
            schema: z.object({
                maxResults: z.number().optional().default(50).describe('Maximum number of messages to return')
            }),
            baseUrl: BASE_URL,
            method: 'GET',
            headers: {}
        }

        super({ ...toolInput, accessToken: args.accessToken, defaultParams: args.defaultParams })
    }

    protected async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const { maxResults = 50 } = params

        try {
            // Get messages from all chats
            const chatEndpoint = `/me/chats/getAllMessages?$top=${maxResults}`
            const chatResult = await this.makeTeamsRequest(chatEndpoint)

            return this.formatResponse(
                {
                    success: true,
                    messages: chatResult.value || [],
                    count: chatResult.value?.length || 0,
                    source: 'all_chats_and_channels'
                },
                params
            )
        } catch (error) {
            return this.formatResponse(`Error getting all messages: ${error}`, params)
        }
    }
}

// Main function to create Teams tools
export function createTeamsTools(options: TeamsToolOptions): DynamicStructuredTool[] {
    const tools: DynamicStructuredTool[] = []
    const actions = options.actions || []
    const accessToken = options.accessToken || ''
    const defaultParams = options.defaultParams || {}

    // Channel tools
    if (actions.includes('listChannels')) {
        const listTool = new ListChannelsTool({ accessToken, defaultParams })
        tools.push(listTool)
    }

    if (actions.includes('getChannel')) {
        const getTool = new GetChannelTool({ accessToken, defaultParams })
        tools.push(getTool)
    }

    if (actions.includes('createChannel')) {
        const createTool = new CreateChannelTool({ accessToken, defaultParams })
        tools.push(createTool)
    }

    if (actions.includes('updateChannel')) {
        const updateTool = new UpdateChannelTool({ accessToken, defaultParams })
        tools.push(updateTool)
    }

    if (actions.includes('deleteChannel')) {
        const deleteTool = new DeleteChannelTool({ accessToken, defaultParams })
        tools.push(deleteTool)
    }

    if (actions.includes('archiveChannel')) {
        const archiveTool = new ArchiveChannelTool({ accessToken, defaultParams })
        tools.push(archiveTool)
    }

    if (actions.includes('unarchiveChannel')) {
        const unarchiveTool = new UnarchiveChannelTool({ accessToken, defaultParams })
        tools.push(unarchiveTool)
    }

    if (actions.includes('listChannelMembers')) {
        const listMembersTool = new ListChannelMembersTool({ accessToken, defaultParams })
        tools.push(listMembersTool)
    }

    if (actions.includes('addChannelMember')) {
        const addMemberTool = new AddChannelMemberTool({ accessToken, defaultParams })
        tools.push(addMemberTool)
    }

    if (actions.includes('removeChannelMember')) {
        const removeMemberTool = new RemoveChannelMemberTool({ accessToken, defaultParams })
        tools.push(removeMemberTool)
    }

    // Chat tools
    if (actions.includes('listChats')) {
        const listTool = new ListChatsTool({ accessToken, defaultParams })
        tools.push(listTool)
    }

    if (actions.includes('getChat')) {
        const getTool = new GetChatTool({ accessToken, defaultParams })
        tools.push(getTool)
    }

    if (actions.includes('createChat')) {
        const createTool = new CreateChatTool({ accessToken, defaultParams })
        tools.push(createTool)
    }

    if (actions.includes('updateChat')) {
        const updateTool = new UpdateChatTool({ accessToken, defaultParams })
        tools.push(updateTool)
    }

    if (actions.includes('deleteChat')) {
        const deleteTool = new DeleteChatTool({ accessToken, defaultParams })
        tools.push(deleteTool)
    }

    if (actions.includes('listChatMembers')) {
        const listMembersTool = new ListChatMembersTool({ accessToken, defaultParams })
        tools.push(listMembersTool)
    }

    if (actions.includes('addChatMember')) {
        const addMemberTool = new AddChatMemberTool({ accessToken, defaultParams })
        tools.push(addMemberTool)
    }

    if (actions.includes('removeChatMember')) {
        const removeMemberTool = new RemoveChatMemberTool({ accessToken, defaultParams })
        tools.push(removeMemberTool)
    }

    if (actions.includes('pinMessage')) {
        const pinTool = new PinMessageTool({ accessToken, defaultParams })
        tools.push(pinTool)
    }

    if (actions.includes('unpinMessage')) {
        const unpinTool = new UnpinMessageTool({ accessToken, defaultParams })
        tools.push(unpinTool)
    }

    // Chat message tools
    if (actions.includes('listMessages')) {
        const listTool = new ListMessagesTool({ accessToken, defaultParams })
        tools.push(listTool)
    }

    if (actions.includes('getMessage')) {
        const getTool = new GetMessageTool({ accessToken, defaultParams })
        tools.push(getTool)
    }

    if (actions.includes('sendMessage')) {
        const sendTool = new SendMessageTool({ accessToken, defaultParams })
        tools.push(sendTool)
    }

    if (actions.includes('updateMessage')) {
        const updateTool = new UpdateMessageTool({ accessToken, defaultParams })
        tools.push(updateTool)
    }

    if (actions.includes('deleteMessage')) {
        const deleteTool = new DeleteMessageTool({ accessToken, defaultParams })
        tools.push(deleteTool)
    }

    if (actions.includes('replyToMessage')) {
        const replyTool = new ReplyToMessageTool({ accessToken, defaultParams })
        tools.push(replyTool)
    }

    if (actions.includes('setReaction')) {
        const reactionTool = new SetReactionTool({ accessToken, defaultParams })
        tools.push(reactionTool)
    }

    if (actions.includes('unsetReaction')) {
        const unsetReactionTool = new UnsetReactionTool({ accessToken, defaultParams })
        tools.push(unsetReactionTool)
    }

    if (actions.includes('getAllMessages')) {
        const getAllTool = new GetAllMessagesTool({ accessToken, defaultParams })
        tools.push(getAllTool)
    }

    return tools
}
