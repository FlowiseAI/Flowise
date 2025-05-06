import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData } from '../../../src/utils'
import { Tool } from '@langchain/core/tools'
import { google } from 'googleapis'

export class CreateCalendarEventTool extends Tool {
    name = 'create_calendar_event'
    description = `Create a new event in Google Calendar. Input should be in the following format:
    Title: [event title]
    Start: [YYYY-MM-DD HH:mm]
    End: [YYYY-MM-DD HH:mm]
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
        title: string
        start: string
        end: string
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

        if (!event.title || !event.start || !event.end) {
            throw new Error('Title, start time, and end time are required')
        }

        return event
    }

    async _call(input: string): Promise<string> {
        try {
            const auth = new google.auth.OAuth2()
            auth.setCredentials({ access_token: this.googleAccessToken })
            const calendar = google.calendar({ version: 'v3', auth })

            const eventDetails = this.parseEventInput(input)

            // Check for conflicting events
            const conflictCheck = await calendar.events.list({
                calendarId: eventDetails.calendar || this.calendarId,
                timeMin: eventDetails.start,
                timeMax: eventDetails.end,
                maxResults: 1,
                singleEvents: true
            })

            if (conflictCheck.data.items && conflictCheck.data.items.length > 0) {
                return 'Warning: There are existing events during this time slot. Please check your calendar for conflicts.'
            }

            const event = {
                summary: eventDetails.title,
                description: eventDetails.description,
                start: {
                    dateTime: eventDetails.start
                },
                end: {
                    dateTime: eventDetails.end
                },
                location: eventDetails.location,
                attendees: eventDetails.attendees?.map((email) => ({ email }))
            }

            const response = await calendar.events.insert({
                calendarId: eventDetails.calendar || this.calendarId,
                requestBody: event,
                sendUpdates: 'all'
            })

            return `Event created successfully!\nTitle: ${event.summary}\nStart: ${event.start.dateTime}\nEnd: ${event.end.dateTime}`
        } catch (error: any) {
            console.error('Error creating calendar event:', error)
            if (error.code === 429) {
                return 'Rate limit exceeded. Please try again later.'
            }
            return `Error creating calendar event: ${error.message}`
        }
    }
}

class CreateCalendarEvent_Tools implements INode {
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
        this.label = 'Create Google Calendar Event'
        this.name = 'createGoogleCalendar'
        this.version = 1.0
        this.type = 'CreateGoogleCalendar'
        this.icon = 'google-calendar.svg'
        this.category = 'Tools'
        this.description = 'Create new events in Google Calendar'
        this.baseClasses = [this.type, ...getBaseClasses(CreateCalendarEventTool)]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleOAuth']
        }
        this.inputs = [
            {
                label: 'Select Calendar',
                name: 'calendarId',
                type: 'asyncOptions',
                optional: true,
                placeholder: 'primary',
                description: 'Choose which calendar to retrieve events from',
                loadMethod: 'listCalendars',
                loadOptionsOnOpen: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listCalendars(nodeData: INodeData, options?: ICommonObject): Promise<{ label: string; name: string }[]> {
            try {
                const credentialData: any = await getCredentialData(nodeData?.credential ?? '', options ?? {})
                if (!credentialData?.googleAccessToken) {
                    throw new Error('Google access token not found in credentials')
                }

                const auth = new google.auth.OAuth2()
                auth.setCredentials({ access_token: credentialData.googleAccessToken })
                const calendar = google.calendar({ version: 'v3', auth })

                const response = await calendar.calendarList.list()
                const calendars = response.data.items || []

                return calendars.map((cal) => ({
                    label: cal.summary || 'Unnamed Calendar',
                    name: cal.id || ''
                }))
            } catch (error) {
                console.error('Error fetching calendars:', error)
                return [{ label: 'Primary Calendar', name: 'primary' }]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        let credentialData: any = await getCredentialData(nodeData?.credential ?? '', options)
        if (!credentialData) {
            throw new Error('Failed to retrieve credentials')
        }

        const googleAccessToken = credentialData.googleAccessToken
        if (!googleAccessToken) {
            throw new Error('Google access token not found in credentials')
        }

        const calendarId = (nodeData.inputs?.calendarId as string) || 'primary'

        return new CreateCalendarEventTool(googleAccessToken, calendarId)
    }
}

module.exports = { nodeClass: CreateCalendarEvent_Tools }
