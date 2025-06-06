import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam, refreshOAuth2Token } from '../../../src/utils'
import { createGoogleCalendarTools } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class GoogleCalendar_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google Calendar'
        this.name = 'googleCalendarTool'
        this.version = 1.0
        this.type = 'GoogleCalendar'
        this.icon = 'google-calendar.svg'
        this.category = 'Tools'
        this.description = 'Perform Google Calendar operations such as managing events, calendars, and checking availability'
        this.baseClasses = ['Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleCalendarOAuth2']
        }
        this.inputs = [
            {
                label: 'Type',
                name: 'calendarType',
                type: 'options',
                description: 'Type of Google Calendar operation',
                options: [
                    {
                        label: 'Event',
                        name: 'event'
                    },
                    {
                        label: 'Calendar',
                        name: 'calendar'
                    },
                    {
                        label: 'Freebusy',
                        name: 'freebusy'
                    }
                ]
            },
            // Event Actions
            {
                label: 'Event Actions',
                name: 'eventActions',
                type: 'multiOptions',
                description: 'Actions to perform',
                options: [
                    {
                        label: 'List Events',
                        name: 'listEvents'
                    },
                    {
                        label: 'Create Event',
                        name: 'createEvent'
                    },
                    {
                        label: 'Get Event',
                        name: 'getEvent'
                    },
                    {
                        label: 'Update Event',
                        name: 'updateEvent'
                    },
                    {
                        label: 'Delete Event',
                        name: 'deleteEvent'
                    },
                    {
                        label: 'Quick Add Event',
                        name: 'quickAddEvent'
                    }
                ],
                show: {
                    calendarType: ['event']
                }
            },
            // Calendar Actions
            {
                label: 'Calendar Actions',
                name: 'calendarActions',
                type: 'multiOptions',
                description: 'Actions to perform',
                options: [
                    {
                        label: 'List Calendars',
                        name: 'listCalendars'
                    },
                    {
                        label: 'Create Calendar',
                        name: 'createCalendar'
                    },
                    {
                        label: 'Get Calendar',
                        name: 'getCalendar'
                    },
                    {
                        label: 'Update Calendar',
                        name: 'updateCalendar'
                    },
                    {
                        label: 'Delete Calendar',
                        name: 'deleteCalendar'
                    },
                    {
                        label: 'Clear Calendar',
                        name: 'clearCalendar'
                    }
                ],
                show: {
                    calendarType: ['calendar']
                }
            },
            // Freebusy Actions
            {
                label: 'Freebusy Actions',
                name: 'freebusyActions',
                type: 'multiOptions',
                description: 'Actions to perform',
                options: [
                    {
                        label: 'Query Freebusy',
                        name: 'queryFreebusy'
                    }
                ],
                show: {
                    calendarType: ['freebusy']
                }
            },
            // Event Parameters
            {
                label: 'Calendar ID',
                name: 'calendarId',
                type: 'string',
                description: 'Calendar ID (use "primary" for primary calendar)',
                default: 'primary',
                show: {
                    calendarType: ['event']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Event ID',
                name: 'eventId',
                type: 'string',
                description: 'Event ID for operations on specific events',
                show: {
                    eventActions: ['getEvent', 'updateEvent', 'deleteEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Summary',
                name: 'summary',
                type: 'string',
                description: 'Event title/summary',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Description',
                name: 'description',
                type: 'string',
                description: 'Event description',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Location',
                name: 'location',
                type: 'string',
                description: 'Event location',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Start Date Time',
                name: 'startDateTime',
                type: 'string',
                description: 'Event start time (ISO 8601 format: 2023-12-25T10:00:00)',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'End Date Time',
                name: 'endDateTime',
                type: 'string',
                description: 'Event end time (ISO 8601 format: 2023-12-25T11:00:00)',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Time Zone',
                name: 'timeZone',
                type: 'string',
                description: 'Time zone (e.g., America/New_York)',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'All Day Event',
                name: 'allDay',
                type: 'boolean',
                description: 'Whether this is an all-day event',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Start Date',
                name: 'startDate',
                type: 'string',
                description: 'Start date for all-day events (YYYY-MM-DD format)',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'End Date',
                name: 'endDate',
                type: 'string',
                description: 'End date for all-day events (YYYY-MM-DD format)',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Attendees',
                name: 'attendees',
                type: 'string',
                description: 'Comma-separated list of attendee emails',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Recurrence Rules',
                name: 'recurrence',
                type: 'string',
                description: 'Recurrence rules (RRULE format)',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Reminder Minutes',
                name: 'reminderMinutes',
                type: 'number',
                description: 'Minutes before event to send reminder',
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Visibility',
                name: 'visibility',
                type: 'options',
                description: 'Event visibility',
                options: [
                    { label: 'Default', name: 'default' },
                    { label: 'Public', name: 'public' },
                    { label: 'Private', name: 'private' },
                    { label: 'Confidential', name: 'confidential' }
                ],
                show: {
                    eventActions: ['createEvent', 'updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Quick Add Text',
                name: 'quickAddText',
                type: 'string',
                description: 'Natural language text for quick event creation (e.g., "Lunch with John tomorrow at 12pm")',
                show: {
                    eventActions: ['quickAddEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Time Min',
                name: 'timeMin',
                type: 'string',
                description: 'Lower bound for event search (ISO 8601 format)',
                show: {
                    eventActions: ['listEvents']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Time Max',
                name: 'timeMax',
                type: 'string',
                description: 'Upper bound for event search (ISO 8601 format)',
                show: {
                    eventActions: ['listEvents']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Max Results',
                name: 'maxResults',
                type: 'number',
                description: 'Maximum number of events to return',
                default: 250,
                show: {
                    eventActions: ['listEvents']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Single Events',
                name: 'singleEvents',
                type: 'boolean',
                description: 'Whether to expand recurring events into instances',
                default: true,
                show: {
                    eventActions: ['listEvents']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Order By',
                name: 'orderBy',
                type: 'options',
                description: 'Order of events returned',
                options: [
                    { label: 'Start Time', name: 'startTime' },
                    { label: 'Updated', name: 'updated' }
                ],
                show: {
                    eventActions: ['listEvents']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Query',
                name: 'query',
                type: 'string',
                description: 'Free text search terms',
                show: {
                    eventActions: ['listEvents']
                },
                additionalParams: true,
                optional: true
            },
            // Calendar Parameters
            {
                label: 'Calendar ID',
                name: 'calendarIdForCalendar',
                type: 'string',
                description: 'Calendar ID for operations on specific calendars',
                show: {
                    calendarActions: ['getCalendar', 'updateCalendar', 'deleteCalendar', 'clearCalendar']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Calendar Summary',
                name: 'calendarSummary',
                type: 'string',
                description: 'Calendar title/name',
                show: {
                    calendarActions: ['createCalendar', 'updateCalendar']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Calendar Description',
                name: 'calendarDescription',
                type: 'string',
                description: 'Calendar description',
                show: {
                    calendarActions: ['createCalendar', 'updateCalendar']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Calendar Location',
                name: 'calendarLocation',
                type: 'string',
                description: 'Calendar location',
                show: {
                    calendarActions: ['createCalendar', 'updateCalendar']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Calendar Time Zone',
                name: 'calendarTimeZone',
                type: 'string',
                description: 'Calendar time zone (e.g., America/New_York)',
                show: {
                    calendarActions: ['createCalendar', 'updateCalendar']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Show Hidden',
                name: 'showHidden',
                type: 'boolean',
                description: 'Whether to show hidden calendars',
                show: {
                    calendarActions: ['listCalendars']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Min Access Role',
                name: 'minAccessRole',
                type: 'options',
                description: 'Minimum access role for calendar list',
                options: [
                    { label: 'Free/Busy Reader', name: 'freeBusyReader' },
                    { label: 'Reader', name: 'reader' },
                    { label: 'Writer', name: 'writer' },
                    { label: 'Owner', name: 'owner' }
                ],
                show: {
                    calendarActions: ['listCalendars']
                },
                additionalParams: true,
                optional: true
            },
            // Freebusy Parameters
            {
                label: 'Time Min',
                name: 'freebusyTimeMin',
                type: 'string',
                description: 'Lower bound for freebusy query (ISO 8601 format)',
                show: {
                    freebusyActions: ['queryFreebusy']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Time Max',
                name: 'freebusyTimeMax',
                type: 'string',
                description: 'Upper bound for freebusy query (ISO 8601 format)',
                show: {
                    freebusyActions: ['queryFreebusy']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Calendar IDs',
                name: 'calendarIds',
                type: 'string',
                description: 'Comma-separated list of calendar IDs to check for free/busy info',
                show: {
                    freebusyActions: ['queryFreebusy']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Group Expansion Max',
                name: 'groupExpansionMax',
                type: 'number',
                description: 'Maximum number of calendars for which FreeBusy information is to be provided',
                show: {
                    freebusyActions: ['queryFreebusy']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Calendar Expansion Max',
                name: 'calendarExpansionMax',
                type: 'number',
                description: 'Maximum number of events that can be expanded for each calendar',
                show: {
                    freebusyActions: ['queryFreebusy']
                },
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const calendarType = nodeData.inputs?.calendarType as string

        let credentialData = await getCredentialData(nodeData.credential ?? '', options)
        credentialData = await refreshOAuth2Token(nodeData.credential ?? '', credentialData, options)
        const accessToken = getCredentialParam('access_token', credentialData, nodeData)

        if (!accessToken) {
            throw new Error('No access token found in credential')
        }

        // Get all actions based on type
        let actions: string[] = []

        if (calendarType === 'event') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.eventActions)
        } else if (calendarType === 'calendar') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.calendarActions)
        } else if (calendarType === 'freebusy') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.freebusyActions)
        }

        // Create default params object based on inputs
        const defaultParams: any = {}

        // Event-specific default params
        if (calendarType === 'event') {
            actions.forEach((action) => {
                const params: any = {}

                if (nodeData.inputs?.calendarId) params.calendarId = nodeData.inputs.calendarId
                if (action === 'getEvent' || action === 'updateEvent' || action === 'deleteEvent') {
                    if (nodeData.inputs?.eventId) params.eventId = nodeData.inputs.eventId
                }
                if (action === 'createEvent' || action === 'updateEvent') {
                    if (nodeData.inputs?.summary) params.summary = nodeData.inputs.summary
                    if (nodeData.inputs?.description) params.description = nodeData.inputs.description
                    if (nodeData.inputs?.location) params.location = nodeData.inputs.location
                    if (nodeData.inputs?.startDateTime) params.startDateTime = nodeData.inputs.startDateTime
                    if (nodeData.inputs?.endDateTime) params.endDateTime = nodeData.inputs.endDateTime
                    if (nodeData.inputs?.timeZone) params.timeZone = nodeData.inputs.timeZone
                    if (nodeData.inputs?.allDay !== undefined) params.allDay = nodeData.inputs.allDay
                    if (nodeData.inputs?.startDate) params.startDate = nodeData.inputs.startDate
                    if (nodeData.inputs?.endDate) params.endDate = nodeData.inputs.endDate
                    if (nodeData.inputs?.attendees) params.attendees = nodeData.inputs.attendees
                    if (nodeData.inputs?.recurrence) params.recurrence = nodeData.inputs.recurrence
                    if (nodeData.inputs?.reminderMinutes) params.reminderMinutes = nodeData.inputs.reminderMinutes
                    if (nodeData.inputs?.visibility) params.visibility = nodeData.inputs.visibility
                }
                if (action === 'quickAddEvent') {
                    if (nodeData.inputs?.quickAddText) params.quickAddText = nodeData.inputs.quickAddText
                }
                if (action === 'listEvents') {
                    if (nodeData.inputs?.timeMin) params.timeMin = nodeData.inputs.timeMin
                    if (nodeData.inputs?.timeMax) params.timeMax = nodeData.inputs.timeMax
                    if (nodeData.inputs?.maxResults) params.maxResults = nodeData.inputs.maxResults
                    if (nodeData.inputs?.singleEvents !== undefined) params.singleEvents = nodeData.inputs.singleEvents
                    if (nodeData.inputs?.orderBy) params.orderBy = nodeData.inputs.orderBy
                    if (nodeData.inputs?.query) params.query = nodeData.inputs.query
                }

                defaultParams[action] = params
            })
        }

        // Calendar-specific default params
        if (calendarType === 'calendar') {
            actions.forEach((action) => {
                const params: any = {}

                if (['getCalendar', 'updateCalendar', 'deleteCalendar', 'clearCalendar'].includes(action)) {
                    if (nodeData.inputs?.calendarIdForCalendar) params.calendarId = nodeData.inputs.calendarIdForCalendar
                }
                if (action === 'createCalendar' || action === 'updateCalendar') {
                    if (nodeData.inputs?.calendarSummary) params.summary = nodeData.inputs.calendarSummary
                    if (nodeData.inputs?.calendarDescription) params.description = nodeData.inputs.calendarDescription
                    if (nodeData.inputs?.calendarLocation) params.location = nodeData.inputs.calendarLocation
                    if (nodeData.inputs?.calendarTimeZone) params.timeZone = nodeData.inputs.calendarTimeZone
                }
                if (action === 'listCalendars') {
                    if (nodeData.inputs?.showHidden !== undefined) params.showHidden = nodeData.inputs.showHidden
                    if (nodeData.inputs?.minAccessRole) params.minAccessRole = nodeData.inputs.minAccessRole
                }

                defaultParams[action] = params
            })
        }

        // Freebusy-specific default params
        if (calendarType === 'freebusy') {
            actions.forEach((action) => {
                const params: any = {}

                if (action === 'queryFreebusy') {
                    if (nodeData.inputs?.freebusyTimeMin) params.timeMin = nodeData.inputs.freebusyTimeMin
                    if (nodeData.inputs?.freebusyTimeMax) params.timeMax = nodeData.inputs.freebusyTimeMax
                    if (nodeData.inputs?.calendarIds) params.calendarIds = nodeData.inputs.calendarIds
                    if (nodeData.inputs?.groupExpansionMax) params.groupExpansionMax = nodeData.inputs.groupExpansionMax
                    if (nodeData.inputs?.calendarExpansionMax) params.calendarExpansionMax = nodeData.inputs.calendarExpansionMax
                }

                defaultParams[action] = params
            })
        }

        const tools = createGoogleCalendarTools({
            accessToken,
            actions,
            defaultParams
        })

        return tools
    }
}

module.exports = { nodeClass: GoogleCalendar_Tools }
