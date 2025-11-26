import { z } from 'zod'
import fetch from 'node-fetch'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { TOOL_ARGS_PREFIX, formatToolError } from '../../../src/agents'

export const desc = `Use this when you want to access Microsoft Outlook API for managing calendars, events, and messages`

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

// Define schemas for different Outlook operations

// Calendar Schemas
const ListCalendarsSchema = z.object({
    maxResults: z.number().optional().default(50).describe('Maximum number of calendars to return')
})

const GetCalendarSchema = z.object({
    calendarId: z.string().describe('ID of the calendar to retrieve')
})

const CreateCalendarSchema = z.object({
    calendarName: z.string().describe('Name of the calendar')
})

const UpdateCalendarSchema = z.object({
    calendarId: z.string().describe('ID of the calendar to update'),
    calendarName: z.string().describe('New name of the calendar')
})

const DeleteCalendarSchema = z.object({
    calendarId: z.string().describe('ID of the calendar to delete')
})

const ListEventsSchema = z.object({
    calendarId: z.string().optional().describe('ID of the calendar (empty for primary calendar)'),
    maxResults: z.number().optional().default(50).describe('Maximum number of events to return'),
    startDateTime: z.string().optional().describe('Start date time filter in ISO format'),
    endDateTime: z.string().optional().describe('End date time filter in ISO format')
})

const GetEventSchema = z.object({
    eventId: z.string().describe('ID of the event to retrieve')
})

const CreateEventSchema = z.object({
    subject: z.string().describe('Subject/title of the event'),
    body: z.string().optional().describe('Body/description of the event'),
    startDateTime: z.string().describe('Start date and time in ISO format'),
    endDateTime: z.string().describe('End date and time in ISO format'),
    timeZone: z.string().optional().default('UTC').describe('Time zone for the event'),
    location: z.string().optional().describe('Location of the event'),
    attendees: z.string().optional().describe('Comma-separated list of attendee email addresses')
})

const UpdateEventSchema = z.object({
    eventId: z.string().describe('ID of the event to update'),
    subject: z.string().optional().describe('New subject/title of the event')
})

const DeleteEventSchema = z.object({
    eventId: z.string().describe('ID of the event to delete')
})

// Message Schemas
const ListMessagesSchema = z.object({
    maxResults: z.number().optional().default(50).describe('Maximum number of messages to return'),
    filter: z.string().optional().describe('Filter query (e.g., "isRead eq false")')
})

const GetMessageSchema = z.object({
    messageId: z.string().describe('ID of the message to retrieve')
})

const CreateDraftMessageSchema = z.object({
    to: z.string().describe('Recipient email address(es), comma-separated'),
    subject: z.string().optional().describe('Subject of the message'),
    body: z.string().optional().describe('Body content of the message'),
    cc: z.string().optional().describe('CC email address(es), comma-separated'),
    bcc: z.string().optional().describe('BCC email address(es), comma-separated')
})

const SendMessageSchema = z.object({
    to: z.string().describe('Recipient email address(es), comma-separated'),
    subject: z.string().optional().describe('Subject of the message'),
    body: z.string().optional().describe('Body content of the message')
})

const UpdateMessageSchema = z.object({
    messageId: z.string().describe('ID of the message to update'),
    isRead: z.boolean().optional().describe('Mark message as read/unread')
})

const DeleteMessageSchema = z.object({
    messageId: z.string().describe('ID of the message to delete')
})

const CopyMessageSchema = z.object({
    messageId: z.string().describe('ID of the message to copy'),
    destinationFolderId: z.string().describe('ID of the destination folder')
})

const MoveMessageSchema = z.object({
    messageId: z.string().describe('ID of the message to move'),
    destinationFolderId: z.string().describe('ID of the destination folder')
})

const ReplyMessageSchema = z.object({
    messageId: z.string().describe('ID of the message to reply to'),
    replyBody: z.string().describe('Reply message body')
})

const ForwardMessageSchema = z.object({
    messageId: z.string().describe('ID of the message to forward'),
    forwardTo: z.string().describe('Email address(es) to forward to, comma-separated'),
    forwardComment: z.string().optional().describe('Additional comment to include with forward')
})

class BaseOutlookTool extends DynamicStructuredTool {
    protected accessToken: string = ''

    constructor(args: any) {
        super(args)
        this.accessToken = args.accessToken ?? ''
    }

    async makeGraphRequest(url: string, method: string = 'GET', body?: any, params?: any): Promise<string> {
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
            throw new Error(`Graph API Error ${response.status}: ${response.statusText} - ${errorText}`)
        }

        const data = await response.text()
        return data + TOOL_ARGS_PREFIX + JSON.stringify(params)
    }

    parseEmailAddresses(emailString: string) {
        return emailString.split(',').map((email) => ({
            emailAddress: {
                address: email.trim(),
                name: email.trim()
            }
        }))
    }
}

// Calendar Tools
class ListCalendarsTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_calendars',
            description: 'List calendars in Microsoft Outlook',
            schema: ListCalendarsSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/calendars',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.maxResults) queryParams.append('$top', params.maxResults.toString())

        const url = `https://graph.microsoft.com/v1.0/me/calendars?${queryParams.toString()}`

        try {
            const response = await this.makeGraphRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return formatToolError(`Error listing calendars: ${error}`, {})
        }
    }
}

class GetCalendarTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_calendar',
            description: 'Get a specific calendar by ID from Microsoft Outlook',
            schema: GetCalendarSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/calendars',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const url = `https://graph.microsoft.com/v1.0/me/calendars/${params.calendarId}`

        try {
            const response = await this.makeGraphRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return formatToolError(`Error getting calendar: ${error}`, params)
        }
    }
}

class CreateCalendarTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_calendar',
            description: 'Create a new calendar in Microsoft Outlook',
            schema: CreateCalendarSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/calendars',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const calendarData = {
                name: params.calendarName
            }

            const url = 'https://graph.microsoft.com/v1.0/me/calendars'
            const response = await this.makeGraphRequest(url, 'POST', calendarData, params)
            return response
        } catch (error) {
            return formatToolError(`Error creating calendar: ${error}`, params)
        }
    }
}

class UpdateCalendarTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_calendar',
            description: 'Update a calendar in Microsoft Outlook',
            schema: UpdateCalendarSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/calendars',
            method: 'PATCH',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const calendarData = {
                name: params.calendarName
            }

            const url = `https://graph.microsoft.com/v1.0/me/calendars/${params.calendarId}`
            const response = await this.makeGraphRequest(url, 'PATCH', calendarData, params)
            return response
        } catch (error) {
            return formatToolError(`Error updating calendar: ${error}`, params)
        }
    }
}

class DeleteCalendarTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_calendar',
            description: 'Delete a calendar from Microsoft Outlook',
            schema: DeleteCalendarSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/calendars',
            method: 'DELETE',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const url = `https://graph.microsoft.com/v1.0/me/calendars/${params.calendarId}`

        try {
            await this.makeGraphRequest(url, 'DELETE', undefined, params)
            return `Calendar ${params.calendarId} deleted successfully`
        } catch (error) {
            return formatToolError(`Error deleting calendar: ${error}`, params)
        }
    }
}

class ListEventsTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_events',
            description: 'List events from Microsoft Outlook calendar',
            schema: ListEventsSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/events',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.maxResults) queryParams.append('$top', params.maxResults.toString())
        if (params.startDateTime) queryParams.append('$filter', `start/dateTime ge '${params.startDateTime}'`)
        if (params.endDateTime) {
            const existingFilter = queryParams.get('$filter')
            const endFilter = `end/dateTime le '${params.endDateTime}'`
            if (existingFilter) {
                queryParams.set('$filter', `${existingFilter} and ${endFilter}`)
            } else {
                queryParams.append('$filter', endFilter)
            }
        }

        const baseUrl = params.calendarId
            ? `https://graph.microsoft.com/v1.0/me/calendars/${params.calendarId}/events`
            : 'https://graph.microsoft.com/v1.0/me/events'

        const url = `${baseUrl}?${queryParams.toString()}`

        try {
            const response = await this.makeGraphRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return formatToolError(`Error listing events: ${error}`, params)
        }
    }
}

class GetEventTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_event',
            description: 'Get a specific event by ID from Microsoft Outlook',
            schema: GetEventSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/events',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const url = `https://graph.microsoft.com/v1.0/me/events/${params.eventId}`

        try {
            const response = await this.makeGraphRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return formatToolError(`Error getting event: ${error}`, params)
        }
    }
}

class CreateEventTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_event',
            description: 'Create a new event in Microsoft Outlook calendar',
            schema: CreateEventSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/events',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const eventData = {
                subject: params.subject,
                body: {
                    contentType: 'HTML',
                    content: params.body || ''
                },
                start: {
                    dateTime: params.startDateTime,
                    timeZone: params.timeZone || 'UTC'
                },
                end: {
                    dateTime: params.endDateTime,
                    timeZone: params.timeZone || 'UTC'
                },
                location: params.location
                    ? {
                          displayName: params.location
                      }
                    : undefined,
                attendees: params.attendees ? this.parseEmailAddresses(params.attendees) : []
            }

            const url = 'https://graph.microsoft.com/v1.0/me/events'
            const response = await this.makeGraphRequest(url, 'POST', eventData, params)
            return response
        } catch (error) {
            return formatToolError(`Error creating event: ${error}`, params)
        }
    }
}

class UpdateEventTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_event',
            description: 'Update an event in Microsoft Outlook calendar',
            schema: UpdateEventSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/events',
            method: 'PATCH',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const eventData: any = {}
            if (params.subject) eventData.subject = params.subject

            const url = `https://graph.microsoft.com/v1.0/me/events/${params.eventId}`
            const response = await this.makeGraphRequest(url, 'PATCH', eventData, params)
            return response
        } catch (error) {
            return formatToolError(`Error updating event: ${error}`, params)
        }
    }
}

class DeleteEventTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_event',
            description: 'Delete an event from Microsoft Outlook calendar',
            schema: DeleteEventSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/events',
            method: 'DELETE',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const url = `https://graph.microsoft.com/v1.0/me/events/${params.eventId}`

        try {
            await this.makeGraphRequest(url, 'DELETE', undefined, params)
            return `Event ${params.eventId} deleted successfully`
        } catch (error) {
            return formatToolError(`Error deleting event: ${error}`, params)
        }
    }
}

// Message Tools
class ListMessagesTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_messages',
            description: 'List messages from Microsoft Outlook mailbox',
            schema: ListMessagesSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/messages',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.maxResults) queryParams.append('$top', params.maxResults.toString())
        if (params.filter) queryParams.append('$filter', params.filter)

        const url = `https://graph.microsoft.com/v1.0/me/messages?${queryParams.toString()}`

        try {
            const response = await this.makeGraphRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return formatToolError(`Error listing messages: ${error}`, params)
        }
    }
}

class GetMessageTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_message',
            description: 'Get a specific message by ID from Microsoft Outlook',
            schema: GetMessageSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/messages',
            method: 'GET',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const url = `https://graph.microsoft.com/v1.0/me/messages/${params.messageId}`

        try {
            const response = await this.makeGraphRequest(url, 'GET', undefined, params)
            return response
        } catch (error) {
            return formatToolError(`Error getting message: ${error}`, params)
        }
    }
}

class CreateDraftMessageTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_draft_message',
            description: 'Create a draft message in Microsoft Outlook',
            schema: CreateDraftMessageSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/messages',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const messageData = {
                subject: params.subject || '',
                body: {
                    contentType: 'HTML',
                    content: params.body || ''
                },
                toRecipients: this.parseEmailAddresses(params.to),
                ccRecipients: params.cc ? this.parseEmailAddresses(params.cc) : [],
                bccRecipients: params.bcc ? this.parseEmailAddresses(params.bcc) : []
            }

            const url = 'https://graph.microsoft.com/v1.0/me/messages'
            const response = await this.makeGraphRequest(url, 'POST', messageData, params)
            return response
        } catch (error) {
            return formatToolError(`Error creating draft message: ${error}`, params)
        }
    }
}

class SendMessageTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'send_message',
            description: 'Send a message via Microsoft Outlook',
            schema: SendMessageSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/sendMail',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const messageData = {
                message: {
                    subject: params.subject || '',
                    body: {
                        contentType: 'HTML',
                        content: params.body || ''
                    },
                    toRecipients: this.parseEmailAddresses(params.to)
                },
                saveToSentItems: true
            }

            const url = 'https://graph.microsoft.com/v1.0/me/sendMail'
            await this.makeGraphRequest(url, 'POST', messageData, params)
            return 'Message sent successfully'
        } catch (error) {
            return formatToolError(`Error sending message: ${error}`, params)
        }
    }
}

class UpdateMessageTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_message',
            description: 'Update a message in Microsoft Outlook',
            schema: UpdateMessageSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/messages',
            method: 'PATCH',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const messageData: any = {}
            if (params.isRead !== undefined) messageData.isRead = params.isRead

            const url = `https://graph.microsoft.com/v1.0/me/messages/${params.messageId}`
            const response = await this.makeGraphRequest(url, 'PATCH', messageData, params)
            return response
        } catch (error) {
            return formatToolError(`Error updating message: ${error}`, params)
        }
    }
}

class DeleteMessageTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_message',
            description: 'Delete a message from Microsoft Outlook',
            schema: DeleteMessageSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/messages',
            method: 'DELETE',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const url = `https://graph.microsoft.com/v1.0/me/messages/${params.messageId}`

        try {
            await this.makeGraphRequest(url, 'DELETE', undefined, params)
            return `Message ${params.messageId} deleted successfully`
        } catch (error) {
            return formatToolError(`Error deleting message: ${error}`, params)
        }
    }
}

class CopyMessageTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'copy_message',
            description: 'Copy a message to another folder in Microsoft Outlook',
            schema: CopyMessageSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/messages',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const copyData = {
                destinationId: params.destinationFolderId
            }

            const url = `https://graph.microsoft.com/v1.0/me/messages/${params.messageId}/copy`
            const response = await this.makeGraphRequest(url, 'POST', copyData, params)
            return response
        } catch (error) {
            return formatToolError(`Error copying message: ${error}`, params)
        }
    }
}

class MoveMessageTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'move_message',
            description: 'Move a message to another folder in Microsoft Outlook',
            schema: MoveMessageSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/messages',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const moveData = {
                destinationId: params.destinationFolderId
            }

            const url = `https://graph.microsoft.com/v1.0/me/messages/${params.messageId}/move`
            const response = await this.makeGraphRequest(url, 'POST', moveData, params)
            return response
        } catch (error) {
            return formatToolError(`Error moving message: ${error}`, params)
        }
    }
}

class ReplyMessageTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'reply_message',
            description: 'Reply to a message in Microsoft Outlook',
            schema: ReplyMessageSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/messages',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const replyData = {
                comment: params.replyBody
            }

            const url = `https://graph.microsoft.com/v1.0/me/messages/${params.messageId}/reply`
            await this.makeGraphRequest(url, 'POST', replyData, params)
            return 'Reply sent successfully'
        } catch (error) {
            return formatToolError(`Error replying to message: ${error}`, params)
        }
    }
}

class ForwardMessageTool extends BaseOutlookTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'forward_message',
            description: 'Forward a message in Microsoft Outlook',
            schema: ForwardMessageSchema,
            baseUrl: 'https://graph.microsoft.com/v1.0/me/messages',
            method: 'POST',
            headers: {}
        }
        super({ ...toolInput, accessToken: args.accessToken })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const forwardData = {
                toRecipients: this.parseEmailAddresses(params.forwardTo),
                comment: params.forwardComment || ''
            }

            const url = `https://graph.microsoft.com/v1.0/me/messages/${params.messageId}/forward`
            await this.makeGraphRequest(url, 'POST', forwardData, params)
            return 'Message forwarded successfully'
        } catch (error) {
            return `Error forwarding message: ${error}`
        }
    }
}

export const createOutlookTools = (args?: RequestParameters): DynamicStructuredTool[] => {
    const tools: DynamicStructuredTool[] = []
    const actions = args?.actions || []
    const accessToken = args?.accessToken || ''
    const defaultParams = args?.defaultParams || {}

    // Calendar tools
    if (actions.includes('listCalendars')) {
        const listTool = new ListCalendarsTool({ accessToken, defaultParams })
        tools.push(listTool)
    }

    if (actions.includes('getCalendar')) {
        const getTool = new GetCalendarTool({ accessToken, defaultParams })
        tools.push(getTool)
    }

    if (actions.includes('createCalendar')) {
        const createTool = new CreateCalendarTool({ accessToken, defaultParams })
        tools.push(createTool)
    }

    if (actions.includes('updateCalendar')) {
        const updateTool = new UpdateCalendarTool({ accessToken, defaultParams })
        tools.push(updateTool)
    }

    if (actions.includes('deleteCalendar')) {
        const deleteTool = new DeleteCalendarTool({ accessToken, defaultParams })
        tools.push(deleteTool)
    }

    if (actions.includes('listEvents')) {
        const listTool = new ListEventsTool({ accessToken, defaultParams })
        tools.push(listTool)
    }

    if (actions.includes('getEvent')) {
        const getTool = new GetEventTool({ accessToken, defaultParams })
        tools.push(getTool)
    }

    if (actions.includes('createEvent')) {
        const createTool = new CreateEventTool({ accessToken, defaultParams })
        tools.push(createTool)
    }

    if (actions.includes('updateEvent')) {
        const updateTool = new UpdateEventTool({ accessToken, defaultParams })
        tools.push(updateTool)
    }

    if (actions.includes('deleteEvent')) {
        const deleteTool = new DeleteEventTool({ accessToken, defaultParams })
        tools.push(deleteTool)
    }

    // Message tools
    if (actions.includes('listMessages')) {
        const listTool = new ListMessagesTool({ accessToken, defaultParams })
        tools.push(listTool)
    }

    if (actions.includes('getMessage')) {
        const getTool = new GetMessageTool({ accessToken, defaultParams })
        tools.push(getTool)
    }

    if (actions.includes('createDraftMessage')) {
        const createTool = new CreateDraftMessageTool({ accessToken, defaultParams })
        tools.push(createTool)
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

    if (actions.includes('copyMessage')) {
        const copyTool = new CopyMessageTool({ accessToken, defaultParams })
        tools.push(copyTool)
    }

    if (actions.includes('moveMessage')) {
        const moveTool = new MoveMessageTool({ accessToken, defaultParams })
        tools.push(moveTool)
    }

    if (actions.includes('replyMessage')) {
        const replyTool = new ReplyMessageTool({ accessToken, defaultParams })
        tools.push(replyTool)
    }

    if (actions.includes('forwardMessage')) {
        const forwardTool = new ForwardMessageTool({ accessToken, defaultParams })
        tools.push(forwardTool)
    }

    return tools
}
