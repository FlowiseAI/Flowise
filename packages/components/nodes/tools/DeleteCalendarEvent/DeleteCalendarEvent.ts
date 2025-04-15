import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { Tool } from '@langchain/core/tools'
import { google } from 'googleapis'

export class DeleteCalendarEventTool extends Tool {
    name = 'delete_calendar_event'
    description = `Delete an existing event from Google Calendar. Input should be in the following format:
    Event ID: [event id] (required)
    Calendar: (optional) [calendar ID, defaults to primary]
    Confirm: (optional) [true/false, defaults to false]`

    googleAccessToken: string
    calendarId: string

    constructor(googleAccessToken: string, calendarId: string = 'primary') {
        super()
        this.googleAccessToken = googleAccessToken
        this.calendarId = calendarId
    }

    private parseInput(input: string): {
        eventId: string
        calendar?: string
        confirm?: boolean
    } {
        const lines = input.split('\n')
        const params: any = {}

        for (const line of lines) {
            const [key, ...valueParts] = line.split(':')
            const value = valueParts.join(':').trim()

            switch (key.trim().toLowerCase()) {
                case 'event id':
                    params.eventId = value
                    break
                case 'calendar':
                    params.calendar = value
                    break
                case 'confirm':
                    params.confirm = value.toLowerCase() === 'true'
                    break
            }
        }

        if (!params.eventId) {
            throw new Error('Event ID is required')
        }

        return params
    }

    async _call(input: string): Promise<string> {
        try {
            const auth = new google.auth.OAuth2()
            auth.setCredentials({ access_token: this.googleAccessToken })
            const calendar = google.calendar({ version: 'v3', auth })

            const params = this.parseInput(input)
            const calendarId = params.calendar || this.calendarId

            // First, verify the event exists
            const existingEvent = await calendar.events.get({
                calendarId,
                eventId: params.eventId
            })

            // If confirmation is required and not provided
            if (params.confirm !== true) {
                return `Event found: "${existingEvent.data.summary}". To delete, please confirm by adding "Confirm: true" to your request.`
            }

            // Delete the event
            await calendar.events.delete({
                calendarId,
                eventId: params.eventId,
                sendUpdates: 'all'
            })

            return `Event "${existingEvent.data.summary}" has been successfully deleted.`
        } catch (error: any) {
            console.error('Error deleting calendar event:', error)
            if (error.code === 404) {
                return 'Event not found. Please check the Event ID.'
            }
            if (error.code === 429) {
                return 'Rate limit exceeded. Please try again later.'
            }
            return `Error deleting calendar event: ${error.message}`
        }
    }
}

class DeleteCalendarEvent_Tools implements INode {
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
        this.label = 'Delete Google Calendar Event'
        this.name = 'deleteGoogleCalendar'
        this.version = 1.0
        this.type = 'DeleteGoogleCalendar'
        this.icon = 'google-calendar.svg'
        this.category = 'Tools'
        this.description = 'Delete events from Google Calendar'
        this.baseClasses = [this.type, ...getBaseClasses(DeleteCalendarEventTool)]
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
        const credentialData = nodeData.credential ? JSON.parse(nodeData.credential) : null
        if (!credentialData) {
            throw new Error('Failed to retrieve credentials')
        }

        const googleAccessToken = credentialData.googleAccessToken
        if (!googleAccessToken) {
            throw new Error('Google access token not found in credentials')
        }

        const calendarId = (nodeData.inputs?.calendarId as string) || 'primary'

        return new DeleteCalendarEventTool(googleAccessToken, calendarId)
    }
}

module.exports = { nodeClass: DeleteCalendarEvent_Tools }
