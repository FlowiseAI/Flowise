import { z } from 'zod'
import fetch from 'node-fetch'
import { DynamicStructuredTool } from '../OpenAPIToolkit/core'
import { TOOL_ARGS_PREFIX, formatToolError } from '../../../src/agents'

export const desc = `Use this when you want to access Google Calendar API for managing events and calendars`

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

// Define schemas for different Google Calendar operations

// Event Schemas
const ListEventsSchema = z.object({
    calendarId: z.string().default('primary').describe('Calendar ID (use "primary" for primary calendar)'),
    timeMin: z.string().optional().describe('Lower bound for event search (RFC3339 timestamp)'),
    timeMax: z.string().optional().describe('Upper bound for event search (RFC3339 timestamp)'),
    maxResults: z.number().optional().default(250).describe('Maximum number of events to return'),
    singleEvents: z.boolean().optional().default(true).describe('Whether to expand recurring events into instances'),
    orderBy: z.enum(['startTime', 'updated']).optional().describe('Order of events returned'),
    query: z.string().optional().describe('Free text search terms')
})

const CreateEventSchema = z.object({
    calendarId: z.string().default('primary').describe('Calendar ID where the event will be created'),
    summary: z.string().describe('Event title/summary'),
    description: z.string().optional().describe('Event description'),
    location: z.string().optional().describe('Event location'),
    startDateTime: z.string().optional().describe('Event start time (ISO 8601 format)'),
    endDateTime: z.string().optional().describe('Event end time (ISO 8601 format)'),
    startDate: z.string().optional().describe('Start date for all-day events (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('End date for all-day events (YYYY-MM-DD)'),
    timeZone: z.string().optional().describe('Time zone (e.g., America/New_York)'),
    attendees: z.string().optional().describe('Comma-separated list of attendee emails'),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional().default('all').describe('Whether to send notifications to attendees'),
    recurrence: z.string().optional().describe('Recurrence rules (RRULE format)'),
    reminderMinutes: z.number().optional().describe('Minutes before event to send reminder'),
    visibility: z.enum(['default', 'public', 'private', 'confidential']).optional().describe('Event visibility')
})

const GetEventSchema = z.object({
    calendarId: z.string().default('primary').describe('Calendar ID'),
    eventId: z.string().describe('Event ID')
})

const UpdateEventSchema = z.object({
    calendarId: z.string().default('primary').describe('Calendar ID'),
    eventId: z.string().describe('Event ID'),
    summary: z.string().optional().describe('Updated event title/summary'),
    description: z.string().optional().describe('Updated event description'),
    location: z.string().optional().describe('Updated event location'),
    startDateTime: z.string().optional().describe('Updated event start time (ISO 8601 format)'),
    endDateTime: z.string().optional().describe('Updated event end time (ISO 8601 format)'),
    startDate: z.string().optional().describe('Updated start date for all-day events (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('Updated end date for all-day events (YYYY-MM-DD)'),
    timeZone: z.string().optional().describe('Updated time zone'),
    attendees: z.string().optional().describe('Updated comma-separated list of attendee emails'),
    sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional().default('all').describe('Whether to send notifications to attendees'),
    recurrence: z.string().optional().describe('Updated recurrence rules'),
    reminderMinutes: z.number().optional().describe('Updated reminder minutes'),
    visibility: z.enum(['default', 'public', 'private', 'confidential']).optional().describe('Updated event visibility')
})

const DeleteEventSchema = z.object({
    calendarId: z.string().default('primary').describe('Calendar ID'),
    eventId: z.string().describe('Event ID to delete')
})

const QuickAddEventSchema = z.object({
    calendarId: z.string().default('primary').describe('Calendar ID'),
    quickAddText: z.string().describe('Natural language text for quick event creation')
})

// Calendar Schemas
const ListCalendarsSchema = z.object({
    showHidden: z.boolean().optional().describe('Whether to show hidden calendars'),
    minAccessRole: z.enum(['freeBusyReader', 'reader', 'writer', 'owner']).optional().describe('Minimum access role')
})

const CreateCalendarSchema = z.object({
    summary: z.string().describe('Calendar title/name'),
    description: z.string().optional().describe('Calendar description'),
    location: z.string().optional().describe('Calendar location'),
    timeZone: z.string().optional().describe('Calendar time zone (e.g., America/New_York)')
})

const GetCalendarSchema = z.object({
    calendarId: z.string().describe('Calendar ID')
})

const UpdateCalendarSchema = z.object({
    calendarId: z.string().describe('Calendar ID'),
    summary: z.string().optional().describe('Updated calendar title/name'),
    description: z.string().optional().describe('Updated calendar description'),
    location: z.string().optional().describe('Updated calendar location'),
    timeZone: z.string().optional().describe('Updated calendar time zone')
})

const DeleteCalendarSchema = z.object({
    calendarId: z.string().describe('Calendar ID to delete')
})

const ClearCalendarSchema = z.object({
    calendarId: z.string().describe('Calendar ID to clear (removes all events)')
})

// Freebusy Schemas
const QueryFreebusySchema = z.object({
    timeMin: z.string().describe('Lower bound for freebusy query (RFC3339 timestamp)'),
    timeMax: z.string().describe('Upper bound for freebusy query (RFC3339 timestamp)'),
    calendarIds: z.string().describe('Comma-separated list of calendar IDs to check for free/busy info'),
    groupExpansionMax: z.number().optional().describe('Maximum number of calendars for which FreeBusy information is to be provided'),
    calendarExpansionMax: z.number().optional().describe('Maximum number of events that can be expanded for each calendar')
})

class BaseGoogleCalendarTool extends DynamicStructuredTool {
    protected accessToken: string = ''

    constructor(args: any) {
        super(args)
        this.accessToken = args.accessToken ?? ''
    }

    async makeGoogleCalendarRequest({
        endpoint,
        method = 'GET',
        body,
        params
    }: {
        endpoint: string
        method?: string
        body?: any
        params?: any
    }): Promise<string> {
        const url = `https://www.googleapis.com/calendar/v3/${endpoint}`

        const headers = {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...this.headers
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Google Calendar API Error ${response.status}: ${response.statusText} - ${errorText}`)
        }

        const data = await response.text()
        return data + TOOL_ARGS_PREFIX + JSON.stringify(params)
    }
}

// Event Tools
class ListEventsTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_events',
            description: 'List events from Google Calendar',
            schema: ListEventsSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.timeMin) queryParams.append('timeMin', params.timeMin)
        if (params.timeMax) queryParams.append('timeMax', params.timeMax)
        if (params.maxResults) queryParams.append('maxResults', params.maxResults.toString())
        if (params.singleEvents !== undefined) queryParams.append('singleEvents', params.singleEvents.toString())
        if (params.orderBy) queryParams.append('orderBy', params.orderBy)
        if (params.query) queryParams.append('q', params.query)

        const endpoint = `calendars/${encodeURIComponent(params.calendarId)}/events?${queryParams.toString()}`

        try {
            const response = await this.makeGoogleCalendarRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error listing events: ${error}`, params)
        }
    }
}

class CreateEventTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_event',
            description: 'Create a new event in Google Calendar',
            schema: CreateEventSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const eventData: any = {
                summary: params.summary
            }

            if (params.description) eventData.description = params.description
            if (params.location) eventData.location = params.location

            // Handle date/time
            if (params.startDate && params.endDate) {
                // All-day event
                eventData.start = { date: params.startDate }
                eventData.end = { date: params.endDate }
            } else if (params.startDateTime && params.endDateTime) {
                // Timed event
                eventData.start = {
                    dateTime: params.startDateTime,
                    timeZone: params.timeZone || 'UTC'
                }
                eventData.end = {
                    dateTime: params.endDateTime,
                    timeZone: params.timeZone || 'UTC'
                }
            }

            // Handle attendees
            if (params.attendees) {
                eventData.attendees = params.attendees.split(',').map((email: string) => ({
                    email: email.trim()
                }))
            }

            // Handle recurrence
            if (params.recurrence) {
                eventData.recurrence = [params.recurrence]
            }

            // Handle reminders
            if (params.reminderMinutes !== undefined) {
                eventData.reminders = {
                    useDefault: false,
                    overrides: [
                        {
                            method: 'popup',
                            minutes: params.reminderMinutes
                        }
                    ]
                }
            }

            if (params.visibility) eventData.visibility = params.visibility
            const queryParams = new URLSearchParams()
            if (params.sendUpdates) queryParams.append('sendUpdates', params.sendUpdates)

            const endpoint = `calendars/${encodeURIComponent(params.calendarId)}/events?${queryParams.toString()}`

            const response = await this.makeGoogleCalendarRequest({ endpoint, method: 'POST', body: eventData, params })
            return response
        } catch (error) {
            return formatToolError(`Error creating event: ${error}`, params)
        }
    }
}

class GetEventTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_event',
            description: 'Get a specific event from Google Calendar',
            schema: GetEventSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const endpoint = `calendars/${encodeURIComponent(params.calendarId)}/events/${encodeURIComponent(params.eventId)}`
            const response = await this.makeGoogleCalendarRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error getting event: ${error}`, params)
        }
    }
}

class UpdateEventTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_event',
            description: 'Update an existing event in Google Calendar',
            schema: UpdateEventSchema,
            baseUrl: '',
            method: 'PUT',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const updateData: any = {}

            if (params.summary) updateData.summary = params.summary
            if (params.description) updateData.description = params.description
            if (params.location) updateData.location = params.location

            // Handle date/time updates
            if (params.startDate && params.endDate) {
                updateData.start = { date: params.startDate }
                updateData.end = { date: params.endDate }
            } else if (params.startDateTime && params.endDateTime) {
                updateData.start = {
                    dateTime: params.startDateTime,
                    timeZone: params.timeZone || 'UTC'
                }
                updateData.end = {
                    dateTime: params.endDateTime,
                    timeZone: params.timeZone || 'UTC'
                }
            }

            if (params.attendees) {
                updateData.attendees = params.attendees.split(',').map((email: string) => ({
                    email: email.trim()
                }))
            }

            if (params.recurrence) {
                updateData.recurrence = [params.recurrence]
            }

            if (params.reminderMinutes !== undefined) {
                updateData.reminders = {
                    useDefault: false,
                    overrides: [
                        {
                            method: 'popup',
                            minutes: params.reminderMinutes
                        }
                    ]
                }
            }

            if (params.visibility) updateData.visibility = params.visibility
            const queryParams = new URLSearchParams()
            if (params.sendUpdates) queryParams.append('sendUpdates', params.sendUpdates)

            const endpoint = `calendars/${encodeURIComponent(params.calendarId)}/events/${encodeURIComponent(
                params.eventId
            )}?${queryParams.toString()}`
            const response = await this.makeGoogleCalendarRequest({ endpoint, method: 'PUT', body: updateData, params })
            return response
        } catch (error) {
            return formatToolError(`Error updating event: ${error}`, params)
        }
    }
}

class DeleteEventTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_event',
            description: 'Delete an event from Google Calendar',
            schema: DeleteEventSchema,
            baseUrl: '',
            method: 'DELETE',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const endpoint = `calendars/${encodeURIComponent(params.calendarId)}/events/${encodeURIComponent(params.eventId)}`
            const response = await this.makeGoogleCalendarRequest({ endpoint, method: 'DELETE', params })
            return response || 'Event deleted successfully'
        } catch (error) {
            return formatToolError(`Error deleting event: ${error}`, params)
        }
    }
}

class QuickAddEventTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'quick_add_event',
            description: 'Quick add event to Google Calendar using natural language',
            schema: QuickAddEventSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const queryParams = new URLSearchParams()
            queryParams.append('text', params.quickAddText)

            const endpoint = `calendars/${encodeURIComponent(params.calendarId)}/events/quickAdd?${queryParams.toString()}`
            const response = await this.makeGoogleCalendarRequest({ endpoint, method: 'POST', params })
            return response
        } catch (error) {
            return formatToolError(`Error quick adding event: ${error}`, params)
        }
    }
}

// Calendar Tools
class ListCalendarsTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'list_calendars',
            description: 'List calendars from Google Calendar',
            schema: ListCalendarsSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }
        const queryParams = new URLSearchParams()

        if (params.showHidden !== undefined) queryParams.append('showHidden', params.showHidden.toString())
        if (params.minAccessRole) queryParams.append('minAccessRole', params.minAccessRole)

        const endpoint = `users/me/calendarList?${queryParams.toString()}`

        try {
            const response = await this.makeGoogleCalendarRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error listing calendars: ${error}`, params)
        }
    }
}

class CreateCalendarTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'create_calendar',
            description: 'Create a new calendar in Google Calendar',
            schema: CreateCalendarSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const calendarData: any = {
                summary: params.summary
            }

            if (params.description) calendarData.description = params.description
            if (params.location) calendarData.location = params.location
            if (params.timeZone) calendarData.timeZone = params.timeZone

            const endpoint = 'calendars'
            const response = await this.makeGoogleCalendarRequest({ endpoint, method: 'POST', body: calendarData, params })
            return response
        } catch (error) {
            return formatToolError(`Error creating calendar: ${error}`, params)
        }
    }
}

class GetCalendarTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'get_calendar',
            description: 'Get a specific calendar from Google Calendar',
            schema: GetCalendarSchema,
            baseUrl: '',
            method: 'GET',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const endpoint = `calendars/${encodeURIComponent(params.calendarId)}`
            const response = await this.makeGoogleCalendarRequest({ endpoint, params })
            return response
        } catch (error) {
            return formatToolError(`Error getting calendar: ${error}`, params)
        }
    }
}

class UpdateCalendarTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'update_calendar',
            description: 'Update an existing calendar in Google Calendar',
            schema: UpdateCalendarSchema,
            baseUrl: '',
            method: 'PUT',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const updateData: any = {}

            if (params.summary) updateData.summary = params.summary
            if (params.description) updateData.description = params.description
            if (params.location) updateData.location = params.location
            if (params.timeZone) updateData.timeZone = params.timeZone

            const endpoint = `calendars/${encodeURIComponent(params.calendarId)}`
            const response = await this.makeGoogleCalendarRequest({ endpoint, method: 'PUT', body: updateData, params })
            return response
        } catch (error) {
            return formatToolError(`Error updating calendar: ${error}`, params)
        }
    }
}

class DeleteCalendarTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'delete_calendar',
            description: 'Delete a calendar from Google Calendar',
            schema: DeleteCalendarSchema,
            baseUrl: '',
            method: 'DELETE',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const endpoint = `calendars/${encodeURIComponent(params.calendarId)}`
            const response = await this.makeGoogleCalendarRequest({ endpoint, method: 'DELETE', params })
            return response || 'Calendar deleted successfully'
        } catch (error) {
            return formatToolError(`Error deleting calendar: ${error}`, params)
        }
    }
}

class ClearCalendarTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'clear_calendar',
            description: 'Clear all events from a Google Calendar',
            schema: ClearCalendarSchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const endpoint = `calendars/${encodeURIComponent(params.calendarId)}/clear`
            const response = await this.makeGoogleCalendarRequest({ endpoint, method: 'POST', params })
            return response || 'Calendar cleared successfully'
        } catch (error) {
            return formatToolError(`Error clearing calendar: ${error}`, params)
        }
    }
}

// Freebusy Tools
class QueryFreebusyTool extends BaseGoogleCalendarTool {
    defaultParams: any

    constructor(args: any) {
        const toolInput = {
            name: 'query_freebusy',
            description: 'Query free/busy information for a set of calendars',
            schema: QueryFreebusySchema,
            baseUrl: '',
            method: 'POST',
            headers: {}
        }
        super({
            ...toolInput,
            accessToken: args.accessToken
        })
        this.defaultParams = args.defaultParams || {}
    }

    async _call(arg: any): Promise<string> {
        const params = { ...arg, ...this.defaultParams }

        try {
            const freebusyData: any = {
                timeMin: params.timeMin,
                timeMax: params.timeMax,
                items: params.calendarIds.split(',').map((id: string) => ({
                    id: id.trim()
                }))
            }

            if (params.groupExpansionMax !== undefined) {
                freebusyData.groupExpansionMax = params.groupExpansionMax
            }

            if (params.calendarExpansionMax !== undefined) {
                freebusyData.calendarExpansionMax = params.calendarExpansionMax
            }

            const endpoint = 'freeBusy'
            const response = await this.makeGoogleCalendarRequest({ endpoint, method: 'POST', body: freebusyData, params })
            return response
        } catch (error) {
            return formatToolError(`Error querying freebusy: ${error}`, params)
        }
    }
}

export const createGoogleCalendarTools = (args?: RequestParameters): DynamicStructuredTool[] => {
    const tools: DynamicStructuredTool[] = []
    const actions = args?.actions || []
    const accessToken = args?.accessToken || ''
    const defaultParams = args?.defaultParams || {}

    // Event tools
    if (actions.includes('listEvents')) {
        tools.push(new ListEventsTool({ accessToken, defaultParams }))
    }

    if (actions.includes('createEvent')) {
        tools.push(new CreateEventTool({ accessToken, defaultParams }))
    }

    if (actions.includes('getEvent')) {
        tools.push(new GetEventTool({ accessToken, defaultParams }))
    }

    if (actions.includes('updateEvent')) {
        tools.push(new UpdateEventTool({ accessToken, defaultParams }))
    }

    if (actions.includes('deleteEvent')) {
        tools.push(new DeleteEventTool({ accessToken, defaultParams }))
    }

    if (actions.includes('quickAddEvent')) {
        tools.push(new QuickAddEventTool({ accessToken, defaultParams }))
    }

    // Calendar tools
    if (actions.includes('listCalendars')) {
        tools.push(new ListCalendarsTool({ accessToken, defaultParams }))
    }

    if (actions.includes('createCalendar')) {
        tools.push(new CreateCalendarTool({ accessToken, defaultParams }))
    }

    if (actions.includes('getCalendar')) {
        tools.push(new GetCalendarTool({ accessToken, defaultParams }))
    }

    if (actions.includes('updateCalendar')) {
        tools.push(new UpdateCalendarTool({ accessToken, defaultParams }))
    }

    if (actions.includes('deleteCalendar')) {
        tools.push(new DeleteCalendarTool({ accessToken, defaultParams }))
    }

    if (actions.includes('clearCalendar')) {
        tools.push(new ClearCalendarTool({ accessToken, defaultParams }))
    }

    // Freebusy tools
    if (actions.includes('queryFreebusy')) {
        tools.push(new QueryFreebusyTool({ accessToken, defaultParams }))
    }

    return tools
}
