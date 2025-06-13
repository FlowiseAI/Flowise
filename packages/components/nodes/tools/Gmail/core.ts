import { z } from 'zod'
import fetch from 'node-fetch'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { TOOL_ARGS_PREFIX } from '../../../src/agents'

export const desc = `Use this when you want to access Gmail API for managing drafts, messages, labels, and threads`

export interface Headers {
    [key: string]: string
}

export interface Body {
    [key: string]: any
}

export interface RequestParameters {
    headers?: Headers
    body?: Body
    url?: string
    description?: string
    name?: string
    actions?: string[]
    accessToken?: string
    defaultParams?: any
}

// Define schemas for different Gmail operations
const ListSchema = z.object({
    maxResults: z.number().optional().default(100).describe('Maximum number of results to return'),
    query: z.string().optional().describe('Query string for filtering results (Gmail search syntax)')
})

const CreateDraftSchema = z.object({
    to: z.string().describe('Recipient email address(es), comma-separated'),
    subject: z.string().optional().describe('Email subject'),
    body: z.string().optional().describe('Email body content'),
    cc: z.string().optional().describe('CC email address(es), comma-separated'),
    bcc: z.string().optional().describe('BCC email address(es), comma-separated')
})

const SendMessageSchema = z.object({
    to: z.string().describe('Recipient email address(es), comma-separated'),
    subject: z.string().optional().describe('Email subject'),
    body: z.string().optional().describe('Email body content'),
    cc: z.string().optional().describe('CC email address(es), comma-separated'),
    bcc: z.string().optional().describe('BCC email address(es), comma-separated')
})

const GetByIdSchema = z.object({
    id: z.string().describe('ID of the resource')
})

const ModifySchema = z.object({
    id: z.string().describe('ID of the resource'),
    addLabelIds: z.array(z.string()).optional().describe('Label IDs to add'),
    removeLabelIds: z.array(z.string()).optional().describe('Label IDs to remove')
})

const CreateLabelSchema = z.object({
    labelName: z.string().describe('Name of the label'),
    labelColor: z.string().optional().describe('Color of the label (hex color code)')
})

class BaseGmailTool extends DynamicStructuredTool {
    protected accessToken: string = ''

    constructor(args: any) {
        super(args)
        this.accessToken = args.accessToken ?? ''
    }

    async makeGmailRequest(url: string, method: string = 'GET', body?: any, params?: any): Promise<string> {
        const headers = {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...this.headers
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Gmail API Error ${response.status}: ${response.statusText} - ${errorText}`)
        }

        const data = await response.text()
        return data + TOOL_ARGS_PREFIX + JSON.stringify(params)
    }

    createMimeMessage(to: string, subject?: string, body?: string, cc?: string, bcc?: string): string {
        let message = ''

        message += `To: ${to}\r\n`
        if (cc) message += `Cc: ${cc}\r\n`
        if (bcc) message += `Bcc: ${bcc}\r\n`
        if (subject) message += `Subject: ${subject}\r\n`
        message += `MIME-Version: 1.0\r\n`
        message += `Content-Type: text/html; charset=utf-8\r\n`
        message += `Content-Transfer-Encoding: base64\r\n\r\n`

        if (body) {
            message += Buffer.from(body, 'utf-8').toString('base64')
        }

        return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
}

// Draft Tools
class ListDraftsTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_drafts',
            description: 'List drafts in Gmail mailbox',
            schema: ListSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.maxResults) queryParams.append('maxResults', params.maxResults.toString())
        if (params.query) queryParams.append('q', params.query)

        const url = `https://gmail.googleapis.com/gmail/v1/users/me/drafts?${queryParams.toString()}`

        try {
            const response = await this.makeGmailRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return `Error listing drafts: ${error}`
        }
    }
}

class CreateDraftTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_draft',
            description: 'Create a new draft in Gmail',
            schema: CreateDraftSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const raw = this.createMimeMessage(params.to, params.subject, params.body, params.cc, params.bcc)
            const draftData = {
                message: {
                    raw: raw
                }
            }

            const url = 'https://gmail.googleapis.com/gmail/v1/users/me/drafts'
            const response = await this.makeGmailRequest(url, 'POST', draftData, params)
            return response
        } catch (error) {
            return `Error creating draft: ${error}`
        }
    }
}

class GetDraftTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_draft',
            description: 'Get a specific draft from Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const draftId = params.id || params.draftId

        if (!draftId) {
            return 'Error: Draft ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`
            const response = await this.makeGmailRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return `Error getting draft: ${error}`
        }
    }
}

class UpdateDraftTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_draft',
            description: 'Update a specific draft in Gmail',
            schema: CreateDraftSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
            method: 'PUT',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const draftId = params.id || params.draftId

        if (!draftId) {
            return 'Error: Draft ID is required'
        }

        try {
            const raw = this.createMimeMessage(params.to, params.subject, params.body, params.cc, params.bcc)
            const draftData = {
                message: {
                    raw: raw
                }
            }

            const url = `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`
            const response = await this.makeGmailRequest(url, 'PUT', draftData, params)
            return response
        } catch (error) {
            return `Error updating draft: ${error}`
        }
    }
}

class SendDraftTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'send_draft',
            description: 'Send a specific draft from Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/drafts/send',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const draftId = params.id || params.draftId

        if (!draftId) {
            return 'Error: Draft ID is required'
        }

        try {
            const url = 'https://gmail.googleapis.com/gmail/v1/users/me/drafts/send'
            const response = await this.makeGmailRequest(url, 'POST', { id: draftId }, params)
            return response
        } catch (error) {
            return `Error sending draft: ${error}`
        }
    }
}

class DeleteDraftTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_draft',
            description: 'Delete a specific draft from Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
            method: 'DELETE',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const draftId = params.id || params.draftId

        if (!draftId) {
            return 'Error: Draft ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftId}`
            await this.makeGmailRequest(url, 'DELETE', undefined, params)
            return `Draft ${draftId} deleted successfully`
        } catch (error) {
            return `Error deleting draft: ${error}`
        }
    }
}

// Message Tools
class ListMessagesTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_messages',
            description: 'List messages in Gmail mailbox',
            schema: ListSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.maxResults) queryParams.append('maxResults', params.maxResults.toString())
        if (params.query) queryParams.append('q', params.query)

        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${queryParams.toString()}`

        try {
            const response = await this.makeGmailRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return `Error listing messages: ${error}`
        }
    }
}

class GetMessageTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_message',
            description: 'Get a specific message from Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const messageId = params.id || params.messageId

        if (!messageId) {
            return 'Error: Message ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`
            const response = await this.makeGmailRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return `Error getting message: ${error}`
        }
    }
}

class SendMessageTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'send_message',
            description: 'Send a new message via Gmail',
            schema: SendMessageSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const raw = this.createMimeMessage(params.to, params.subject, params.body, params.cc, params.bcc)
            const messageData = {
                raw: raw
            }

            const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
            const response = await this.makeGmailRequest(url, 'POST', messageData, params)
            return response
        } catch (error) {
            return `Error sending message: ${error}`
        }
    }
}

class ModifyMessageTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'modify_message',
            description: 'Modify labels on a message in Gmail',
            schema: ModifySchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const messageId = params.id || params.messageId

        if (!messageId) {
            return 'Error: Message ID is required'
        }

        try {
            const modifyData: any = {}
            if (params.addLabelIds && params.addLabelIds.length > 0) {
                modifyData.addLabelIds = params.addLabelIds
            }
            if (params.removeLabelIds && params.removeLabelIds.length > 0) {
                modifyData.removeLabelIds = params.removeLabelIds
            }

            const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`
            const response = await this.makeGmailRequest(url, 'POST', modifyData, params)
            return response
        } catch (error) {
            return `Error modifying message: ${error}`
        }
    }
}

class TrashMessageTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'trash_message',
            description: 'Move a message to trash in Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const messageId = params.id || params.messageId

        if (!messageId) {
            return 'Error: Message ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`
            const response = await this.makeGmailRequest(url, 'POST', undefined, params)
            return response
        } catch (error) {
            return `Error moving message to trash: ${error}`
        }
    }
}

class UntrashMessageTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'untrash_message',
            description: 'Remove a message from trash in Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const messageId = params.id || params.messageId

        if (!messageId) {
            return 'Error: Message ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/untrash`
            const response = await this.makeGmailRequest(url, 'POST', undefined, params)
            return response
        } catch (error) {
            return `Error removing message from trash: ${error}`
        }
    }
}

class DeleteMessageTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_message',
            description: 'Permanently delete a message from Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
            method: 'DELETE',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const messageId = params.id || params.messageId

        if (!messageId) {
            return 'Error: Message ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`
            await this.makeGmailRequest(url, 'DELETE', undefined, params)
            return `Message ${messageId} deleted successfully`
        } catch (error) {
            return `Error deleting message: ${error}`
        }
    }
}

// Label Tools
class ListLabelsTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_labels',
            description: 'List labels in Gmail mailbox',
            schema: z.object({}),
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/labels',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(): Promise<string> {
        try {
            const url = 'https://gmail.googleapis.com/gmail/v1/users/me/labels'
            const response = await this.makeGmailRequest(url, 'GET', undefined, {})
            return response
        } catch (error) {
            return `Error listing labels: ${error}`
        }
    }
}

class GetLabelTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_label',
            description: 'Get a specific label from Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/labels',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const labelId = params.id || params.labelId

        if (!labelId) {
            return 'Error: Label ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`
            const response = await this.makeGmailRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return `Error getting label: ${error}`
        }
    }
}

class CreateLabelTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_label',
            description: 'Create a new label in Gmail',
            schema: CreateLabelSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/labels',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        if (!params.labelName) {
            return 'Error: Label name is required'
        }

        try {
            const labelData: any = {
                name: params.labelName,
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show'
            }

            if (params.labelColor) {
                labelData.color = {
                    backgroundColor: params.labelColor
                }
            }

            const url = 'https://gmail.googleapis.com/gmail/v1/users/me/labels'
            const response = await this.makeGmailRequest(url, 'POST', labelData, params)
            return response
        } catch (error) {
            return `Error creating label: ${error}`
        }
    }
}

class UpdateLabelTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_label',
            description: 'Update a label in Gmail',
            schema: CreateLabelSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/labels',
            method: 'PUT',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const labelId = params.labelId

        if (!labelId) {
            return 'Error: Label ID is required'
        }

        try {
            const labelData: any = {}
            if (params.labelName) {
                labelData.name = params.labelName
            }
            if (params.labelColor) {
                labelData.color = {
                    backgroundColor: params.labelColor
                }
            }

            const url = `https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`
            const response = await this.makeGmailRequest(url, 'PUT', labelData, params)
            return response
        } catch (error) {
            return `Error updating label: ${error}`
        }
    }
}

class DeleteLabelTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_label',
            description: 'Delete a label from Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/labels',
            method: 'DELETE',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const labelId = params.id || params.labelId

        if (!labelId) {
            return 'Error: Label ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`
            await this.makeGmailRequest(url, 'DELETE', undefined, params)
            return `Label ${labelId} deleted successfully`
        } catch (error) {
            return `Error deleting label: ${error}`
        }
    }
}

// Thread Tools
class ListThreadsTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_threads',
            description: 'List threads in Gmail mailbox',
            schema: ListSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/threads',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.maxResults) queryParams.append('maxResults', params.maxResults.toString())
        if (params.query) queryParams.append('q', params.query)

        const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads?${queryParams.toString()}`

        try {
            const response = await this.makeGmailRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return `Error listing threads: ${error}`
        }
    }
}

class GetThreadTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_thread',
            description: 'Get a specific thread from Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/threads',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const threadId = params.id || params.threadId

        if (!threadId) {
            return 'Error: Thread ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`
            const response = await this.makeGmailRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return `Error getting thread: ${error}`
        }
    }
}

class ModifyThreadTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'modify_thread',
            description: 'Modify labels on a thread in Gmail',
            schema: ModifySchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/threads',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const threadId = params.id || params.threadId

        if (!threadId) {
            return 'Error: Thread ID is required'
        }

        try {
            const modifyData: any = {}
            if (params.addLabelIds && params.addLabelIds.length > 0) {
                modifyData.addLabelIds = params.addLabelIds
            }
            if (params.removeLabelIds && params.removeLabelIds.length > 0) {
                modifyData.removeLabelIds = params.removeLabelIds
            }

            const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`
            const response = await this.makeGmailRequest(url, 'POST', modifyData, params)
            return response
        } catch (error) {
            return `Error modifying thread: ${error}`
        }
    }
}

class TrashThreadTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'trash_thread',
            description: 'Move a thread to trash in Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/threads',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const threadId = params.id || params.threadId

        if (!threadId) {
            return 'Error: Thread ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/trash`
            const response = await this.makeGmailRequest(url, 'POST', undefined, params)
            return response
        } catch (error) {
            return `Error moving thread to trash: ${error}`
        }
    }
}

class UntrashThreadTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'untrash_thread',
            description: 'Remove a thread from trash in Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/threads',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const threadId = params.id || params.threadId

        if (!threadId) {
            return 'Error: Thread ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/untrash`
            const response = await this.makeGmailRequest(url, 'POST', undefined, params)
            return response
        } catch (error) {
            return `Error removing thread from trash: ${error}`
        }
    }
}

class DeleteThreadTool extends BaseGmailTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_thread',
            description: 'Permanently delete a thread from Gmail',
            schema: GetByIdSchema,
            baseUrl: 'https://gmail.googleapis.com/gmail/v1/users/me/threads',
            method: 'DELETE',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const threadId = params.id || params.threadId

        if (!threadId) {
            return 'Error: Thread ID is required'
        }

        try {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`
            await this.makeGmailRequest(url, 'DELETE', undefined, params)
            return `Thread ${threadId} deleted successfully`
        } catch (error) {
            return `Error deleting thread: ${error}`
        }
    }
}

export const createGmailTools = (args?: RequestParameters): DynamicStructuredTool[] => {
    const tools: DynamicStructuredTool[] = []
    const actions = args?.actions || []
    const accessToken = args?.accessToken || ''
    const defaultParams = args?.defaultParams || {}

    // Draft tools
    if (actions.includes('listDrafts')) {
        tools.push(
            new ListDraftsTool({
                accessToken,
                defaultParams: defaultParams.listDrafts
            })
        )
    }

    if (actions.includes('createDraft')) {
        tools.push(
            new CreateDraftTool({
                accessToken,
                defaultParams: defaultParams.createDraft
            })
        )
    }

    if (actions.includes('getDraft')) {
        tools.push(
            new GetDraftTool({
                accessToken,
                defaultParams: defaultParams.getDraft
            })
        )
    }

    if (actions.includes('updateDraft')) {
        tools.push(
            new UpdateDraftTool({
                accessToken,
                defaultParams: defaultParams.updateDraft
            })
        )
    }

    if (actions.includes('sendDraft')) {
        tools.push(
            new SendDraftTool({
                accessToken,
                defaultParams: defaultParams.sendDraft
            })
        )
    }

    if (actions.includes('deleteDraft')) {
        tools.push(
            new DeleteDraftTool({
                accessToken,
                defaultParams: defaultParams.deleteDraft
            })
        )
    }

    // Message tools
    if (actions.includes('listMessages')) {
        tools.push(
            new ListMessagesTool({
                accessToken,
                defaultParams: defaultParams.listMessages
            })
        )
    }

    if (actions.includes('getMessage')) {
        tools.push(
            new GetMessageTool({
                accessToken,
                defaultParams: defaultParams.getMessage
            })
        )
    }

    if (actions.includes('sendMessage')) {
        tools.push(
            new SendMessageTool({
                accessToken,
                defaultParams: defaultParams.sendMessage
            })
        )
    }

    if (actions.includes('modifyMessage')) {
        tools.push(
            new ModifyMessageTool({
                accessToken,
                defaultParams: defaultParams.modifyMessage
            })
        )
    }

    if (actions.includes('trashMessage')) {
        tools.push(
            new TrashMessageTool({
                accessToken,
                defaultParams: defaultParams.trashMessage
            })
        )
    }

    if (actions.includes('untrashMessage')) {
        tools.push(
            new UntrashMessageTool({
                accessToken,
                defaultParams: defaultParams.untrashMessage
            })
        )
    }

    if (actions.includes('deleteMessage')) {
        tools.push(
            new DeleteMessageTool({
                accessToken,
                defaultParams: defaultParams.deleteMessage
            })
        )
    }

    // Label tools
    if (actions.includes('listLabels')) {
        tools.push(
            new ListLabelsTool({
                accessToken,
                defaultParams: defaultParams.listLabels
            })
        )
    }

    if (actions.includes('getLabel')) {
        tools.push(
            new GetLabelTool({
                accessToken,
                defaultParams: defaultParams.getLabel
            })
        )
    }

    if (actions.includes('createLabel')) {
        tools.push(
            new CreateLabelTool({
                accessToken,
                defaultParams: defaultParams.createLabel
            })
        )
    }

    if (actions.includes('updateLabel')) {
        tools.push(
            new UpdateLabelTool({
                accessToken,
                defaultParams: defaultParams.updateLabel
            })
        )
    }

    if (actions.includes('deleteLabel')) {
        tools.push(
            new DeleteLabelTool({
                accessToken,
                defaultParams: defaultParams.deleteLabel
            })
        )
    }

    // Thread tools
    if (actions.includes('listThreads')) {
        tools.push(
            new ListThreadsTool({
                accessToken,
                defaultParams: defaultParams.listThreads
            })
        )
    }

    if (actions.includes('getThread')) {
        tools.push(
            new GetThreadTool({
                accessToken,
                defaultParams: defaultParams.getThread
            })
        )
    }

    if (actions.includes('modifyThread')) {
        tools.push(
            new ModifyThreadTool({
                accessToken,
                defaultParams: defaultParams.modifyThread
            })
        )
    }

    if (actions.includes('trashThread')) {
        tools.push(
            new TrashThreadTool({
                accessToken,
                defaultParams: defaultParams.trashThread
            })
        )
    }

    if (actions.includes('untrashThread')) {
        tools.push(
            new UntrashThreadTool({
                accessToken,
                defaultParams: defaultParams.untrashThread
            })
        )
    }

    if (actions.includes('deleteThread')) {
        tools.push(
            new DeleteThreadTool({
                accessToken,
                defaultParams: defaultParams.deleteThread
            })
        )
    }

    return tools
}
