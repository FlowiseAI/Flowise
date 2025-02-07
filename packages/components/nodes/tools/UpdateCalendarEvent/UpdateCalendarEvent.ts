import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { Tool } from '@langchain/core/tools'
import { google } from 'googleapis'

export class UpdateCalendarEventTool extends Tool {
    name = 'update_calendar_event'
    description = `Update an existing event in Google Calendar. Input should be in the following format:
    Event ID: [event id] (required)
    Title: (optional) [new event title]
    Start: (optional) [YYYY-MM-DD HH:mm]
    End: (optional) [YYYY-MM-DD HH:mm]
    Description: (optional) [event description]
    Location: (optional) [event location]
    Attendees: (optional) [comma-separated email addresses]
    Calendar: (optional) [calendar ID, defaults to primary]`

    googleAccessToken: string
    calendarId: string

    constructor(googleAccessToken: string, calendarId: string = 'primary') {
        super()
        this.googleAccessToken = googleAccessToken
        this.calendarId = calendarId
    }

    private parseEventInput(input: string): {
        eventId: string
        title?: string
        start?: string
        end?: string
        description?: string
        location?: string
        attendees?: string[]
        calendar?: string
    } {
        const lines = input.split('\n')
        const event: any = {}

        for (const line of lines) {
            const [key, ...valueParts] = line.split(':')
            const value = valueParts.join(':').trim()

            switch (key.trim().toLowerCase()) {
                case 'event id':
                    event.eventId = value
                    break
                case 'title':
                    event.title = value
                    break
                case 'start':
                    event.start = new Date(value).toISOString()
                    break
                case 'end':
                    event.end = new Date(value).toISOString()
                    break
                case 'description':
                    event.description = value
                    break
                case 'location':
                    event.location = value
                    break
                case 'attendees':
                    event.attendees = value.split(',').map((email) => email.trim())
                    break
                case 'calendar':
                    event.calendar = value
                    break
            }
        }

        if (!event.eventId) {
            throw new Error('Event ID is required')
        }

        return event
    }

    async _call(input: string): Promise<string> {
        try {
            const auth = new google.auth.OAuth2()
            auth.setCredentials({ access_token: this.googleAccessToken })
            const calendar = google.calendar({ version: 'v3', auth })

            const eventDetails = this.parseEventInput(input)
            const calendarId = eventDetails.calendar || this.calendarId

            // First, get the existing event
            const existingEvent = await calendar.events.get({
                calendarId,
                eventId: eventDetails.eventId
            })

            // Check for conflicts if time is being updated
            if (eventDetails.start && eventDetails.end) {
                const conflictCheck = await calendar.events.list({
                    calendarId,
                    timeMin: eventDetails.start,
                    timeMax: eventDetails.end,
                    maxResults: 2,
                    singleEvents: true
                })

                const conflicts = conflictCheck.data.items?.filter((event) => event.id !== eventDetails.eventId)

                if (conflicts && conflicts.length > 0) {
                    return 'Warning: There are existing events during this time slot. Please check your calendar for conflicts.'
                }
            }

            const updatePayload: any = {
                ...existingEvent.data
            }

            if (eventDetails.title) updatePayload.summary = eventDetails.title
            if (eventDetails.description) updatePayload.description = eventDetails.description
            if (eventDetails.location) updatePayload.location = eventDetails.location
            if (eventDetails.start) updatePayload.start = { dateTime: eventDetails.start }
            if (eventDetails.end) updatePayload.end = { dateTime: eventDetails.end }
            if (eventDetails.attendees) {
                updatePayload.attendees = eventDetails.attendees.map((email) => ({ email }))
            }

            const response = await calendar.events.update({
                calendarId,
                eventId: eventDetails.eventId,
                requestBody: updatePayload,
                sendUpdates: 'all'
            })

            return `Event updated successfully!\nTitle: ${response.data.summary}\nStart: ${response.data.start?.dateTime}\nEnd: ${response.data.end?.dateTime}`
        } catch (error: any) {
            console.error('Error updating calendar event:', error)
            if (error.code === 404) {
                return 'Event not found. Please check the Event ID.'
            }
            if (error.code === 429) {
                return 'Rate limit exceeded. Please try again later.'
            }
            return `Error updating calendar event: ${error.message}`
        }
    }
}

class UpdateCalendarEvent_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Update Google Calendar Event'
        this.name = 'updateGoogleCalendar'
        this.version = 1.0
        this.type = 'UpdateGoogleCalendar'
        this.icon = 'google-calendar.svg'
        this.category = 'Tools'
        this.description = 'Update existing events in Google Calendar'
        this.baseClasses = [this.type, ...getBaseClasses(UpdateCalendarEventTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleOAuth']
        }
        this.inputs = [
            {
                label: 'Calendar ID',
                name: 'calendarId',
                type: 'string',
                optional: true,
                placeholder: 'primary'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = nodeData.credential ? JSON.parse(nodeData.credential) : null
        if (!credentialData) {
            throw new Error('Failed to retrieve credentials')
        }

        const googleAccessToken = credentialData.googleAccessToken
        if (!googleAccessToken) {
            throw new Error('Google access token not found in credentials')
        }

        const calendarId = (nodeData.inputs?.calendarId as string) || 'primary'

        return new UpdateCalendarEventTool(googleAccessToken, calendarId)
    }
}

module.exports = { nodeClass: UpdateCalendarEvent_Tools }
