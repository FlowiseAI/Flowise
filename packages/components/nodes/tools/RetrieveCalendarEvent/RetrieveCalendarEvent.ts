import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData } from '../../../src/utils'
import { Tool } from '@langchain/core/tools'
import { google } from 'googleapis'

export class RetrieveCalendarEventTool extends Tool {
    name = 'retrieve_calendar_events'
    description = `Retrieve events from Google Calendar. You can:
    - Specify date range (e.g., "from 2024-03-20 to 2024-03-25")
    - Request specific timeframes (e.g., "today", "next week", "next month")
    - Set page size (e.g., "show 5 events", "limit 20")
    - Retrieve a specific event by ID (e.g., "event id: abc123xyz")
    Default shows next 7 days with 10 events.`
    googleAccessToken: string
    calendarId: string

    constructor(googleAccessToken: string, calendarId: string = 'primary') {
        super()
        this.googleAccessToken = googleAccessToken
        this.calendarId = calendarId
    }

    async _call(input: string): Promise<string> {
        try {
            const auth = new google.auth.OAuth2()
            auth.setCredentials({ access_token: this.googleAccessToken })
            const calendar = google.calendar({ version: 'v3', auth })

            // Check for event ID in the input
            const eventIdMatch = input.match(/event id:?\s*([^\s]+)/i)
            if (eventIdMatch) {
                const eventId = eventIdMatch[1]
                const event = await calendar.events.get({
                    calendarId: this.calendarId,
                    eventId: eventId
                })

                if (!event.data) {
                    return 'Event not found.'
                }

                const start = event.data.start?.dateTime || event.data.start?.date
                const end = event.data.end?.dateTime || event.data.end?.date
                const attendees = event.data.attendees ? `\n   Attendees: ${event.data.attendees.map((a: any) => a.email).join(', ')}` : ''
                const description = event.data.description ? `\n   Description: ${event.data.description}` : ''
                const location = event.data.location ? `\n   Location: ${event.data.location}` : ''

                return `Event details:\n\n- ${event.data.summary}
   When: ${new Date(start!).toLocaleString()} - ${new Date(end!).toLocaleString()}${location}${attendees}${description}`
            }

            const { timeMin, timeMax, pageSize } = this.parseInput(input)

            const response = await calendar.events.list({
                calendarId: this.calendarId,
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                maxResults: pageSize,
                singleEvents: true,
                orderBy: 'startTime'
            })

            const events = response.data.items || []

            if (events.length === 0) {
                return 'No events found for the specified time range.'
            }

            const formattedEvents = events
                .map((event) => {
                    const start = event.start?.dateTime || event.start?.date
                    const end = event.end?.dateTime || event.end?.date
                    const attendees = event.attendees ? `\n   Attendees: ${event.attendees.map((a: any) => a.email).join(', ')}` : ''
                    const description = event.description ? `\n   Description: ${event.description}` : ''
                    const location = event.location ? `\n   Location: ${event.location}` : ''
                    const eventId = event.id ? `\n   Event ID: ${event.id}` : ''

                    return `- ${event.summary}
   When: ${new Date(start!).toLocaleString()} - ${new Date(end!).toLocaleString()}${location}${attendees}${description}${eventId}`
                })
                .join('\n\n')

            const nextPageToken = response.data.nextPageToken ? '\n\nMore events available. Specify a larger page size to see more.' : ''

            return `Here are the events${nextPageToken}:\n\n${formattedEvents}`
        } catch (error) {
            console.error('Error fetching calendar events:', error)
            return `Error retrieving calendar events: ${error}`
        }
    }

    private parseInput(input: string): { timeMin: Date; timeMax: Date; pageSize: number } {
        const now = new Date()
        let timeMin = now
        let timeMax = new Date()
        let pageSize = 10

        timeMax.setDate(now.getDate() + 7)

        const lowerInput = input.toLowerCase()

        const dateRangeMatch = input.match(/from (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/)
        if (dateRangeMatch) {
            timeMin = new Date(dateRangeMatch[1])
            timeMax = new Date(dateRangeMatch[2])
            timeMax.setHours(23, 59, 59, 999)
        } else {
            if (lowerInput.includes('next 10 days')) {
                timeMax.setDate(now.getDate() + 10)
            } else if (lowerInput.includes('next month')) {
                timeMax.setMonth(now.getMonth() + 1)
            } else if (lowerInput.includes('next week')) {
                timeMax.setDate(now.getDate() + 7)
            } else if (lowerInput.includes('today')) {
                timeMin.setHours(0, 0, 0, 0)
                timeMax = new Date(now)
                timeMax.setHours(23, 59, 59, 999)
            } else if (lowerInput.includes('tomorrow')) {
                timeMin.setDate(now.getDate() + 1)
                timeMin.setHours(0, 0, 0, 0)
                timeMax.setDate(now.getDate() + 1)
                timeMax.setHours(23, 59, 59, 999)
            }
        }

        const pageSizeMatch = lowerInput.match(/(?:show|limit) (\d+)(?: events)?/)
        if (pageSizeMatch) {
            pageSize = Math.min(Math.max(1, parseInt(pageSizeMatch[1])), 100)
        }
        return { timeMin, timeMax, pageSize }
    }
}

class RetrieveCalendarEvent_Tools implements INode {
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
        this.label = 'Retrieve Google Calendar Events'
        this.name = 'retrieveGoogleCalendar'
        this.version = 1.0
        this.type = 'GoogleCalendar'
        this.icon = 'google-calendar.svg'
        this.category = 'Tools'
        this.description = 'Retrieve events from Google Calendar'
        this.baseClasses = [this.type, ...getBaseClasses(RetrieveCalendarEventTool)]
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
        async listCalendars(nodeData: INodeData): Promise<{ label: string; name: string }[]> {
            try {
                const credentialData = nodeData.credential ? JSON.parse(nodeData.credential) : null
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

        // Check for credential override
        if (nodeData.inputs?.overrideCredential && nodeData.inputs?.alternativeCredential) {
            credentialData = JSON.parse(nodeData.inputs.alternativeCredential as string)
        }

        if (!credentialData) {
            throw new Error('Failed to retrieve credentials')
        }

        const googleAccessToken = credentialData.googleAccessToken
        if (!googleAccessToken) {
            throw new Error('Google access token not found in credentials')
        }

        const calendarId = (nodeData.inputs?.calendarId as string) || 'primary'

        return new RetrieveCalendarEventTool(googleAccessToken, calendarId)
    }
}

module.exports = { nodeClass: RetrieveCalendarEvent_Tools }
