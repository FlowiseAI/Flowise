import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam, refreshOAuth2Token } from '../../../src/utils'
import { createOutlookTools } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class MicrosoftOutlook_Tools implements INode {
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
        this.label = 'Microsoft Outlook'
        this.name = 'microsoftOutlook'
        this.version = 1.0
        this.type = 'MicrosoftOutlook'
        this.icon = 'outlook.svg'
        this.category = 'Tools'
        this.description = 'Perform Microsoft Outlook operations for calendars, events, and messages'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['microsoftOutlookOAuth2']
        }
        this.inputs = [
            {
                label: 'Type',
                name: 'outlookType',
                type: 'options',
                options: [
                    {
                        label: 'Calendar',
                        name: 'calendar'
                    },
                    {
                        label: 'Message',
                        name: 'message'
                    }
                ]
            },
            // Calendar Actions
            {
                label: 'Calendar Actions',
                name: 'calendarActions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'List Calendars',
                        name: 'listCalendars'
                    },
                    {
                        label: 'Get Calendar',
                        name: 'getCalendar'
                    },
                    {
                        label: 'Create Calendar',
                        name: 'createCalendar'
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
                        label: 'List Events',
                        name: 'listEvents'
                    },
                    {
                        label: 'Get Event',
                        name: 'getEvent'
                    },
                    {
                        label: 'Create Event',
                        name: 'createEvent'
                    },
                    {
                        label: 'Update Event',
                        name: 'updateEvent'
                    },
                    {
                        label: 'Delete Event',
                        name: 'deleteEvent'
                    }
                ],
                show: {
                    outlookType: ['calendar']
                }
            },
            // Message Actions
            {
                label: 'Message Actions',
                name: 'messageActions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'List Messages',
                        name: 'listMessages'
                    },
                    {
                        label: 'Get Message',
                        name: 'getMessage'
                    },
                    {
                        label: 'Create Draft Message',
                        name: 'createDraftMessage'
                    },
                    {
                        label: 'Send Message',
                        name: 'sendMessage'
                    },
                    {
                        label: 'Update Message',
                        name: 'updateMessage'
                    },
                    {
                        label: 'Delete Message',
                        name: 'deleteMessage'
                    },
                    {
                        label: 'Copy Message',
                        name: 'copyMessage'
                    },
                    {
                        label: 'Move Message',
                        name: 'moveMessage'
                    },
                    {
                        label: 'Reply to Message',
                        name: 'replyMessage'
                    },
                    {
                        label: 'Forward Message',
                        name: 'forwardMessage'
                    }
                ],
                show: {
                    outlookType: ['message']
                }
            },
            // CALENDAR PARAMETERS
            // List Calendars Parameters
            {
                label: 'Max Results [List Calendars]',
                name: 'maxResultsListCalendars',
                type: 'number',
                description: 'Maximum number of calendars to return',
                default: 50,
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['listCalendars']
                },
                additionalParams: true,
                optional: true
            },
            // Get Calendar Parameters
            {
                label: 'Calendar ID [Get Calendar]',
                name: 'calendarIdGetCalendar',
                type: 'string',
                description: 'ID of the calendar to retrieve',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['getCalendar']
                },
                additionalParams: true,
                optional: true
            },
            // Create Calendar Parameters
            {
                label: 'Calendar Name [Create Calendar]',
                name: 'calendarNameCreateCalendar',
                type: 'string',
                description: 'Name of the calendar',
                placeholder: 'My New Calendar',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['createCalendar']
                },
                additionalParams: true,
                optional: true
            },
            // Update Calendar Parameters
            {
                label: 'Calendar ID [Update Calendar]',
                name: 'calendarIdUpdateCalendar',
                type: 'string',
                description: 'ID of the calendar to update',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['updateCalendar']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Calendar Name [Update Calendar]',
                name: 'calendarNameUpdateCalendar',
                type: 'string',
                description: 'New name of the calendar',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['updateCalendar']
                },
                additionalParams: true,
                optional: true
            },
            // Delete Calendar Parameters
            {
                label: 'Calendar ID [Delete Calendar]',
                name: 'calendarIdDeleteCalendar',
                type: 'string',
                description: 'ID of the calendar to delete',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['deleteCalendar']
                },
                additionalParams: true,
                optional: true
            },
            // List Events Parameters
            {
                label: 'Calendar ID [List Events]',
                name: 'calendarIdListEvents',
                type: 'string',
                description: 'ID of the calendar (leave empty for primary calendar)',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['listEvents']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Max Results [List Events]',
                name: 'maxResultsListEvents',
                type: 'number',
                description: 'Maximum number of events to return',
                default: 50,
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['listEvents']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Start Date Time [List Events]',
                name: 'startDateTimeListEvents',
                type: 'string',
                description: 'Start date time filter in ISO format',
                placeholder: '2024-01-01T00:00:00Z',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['listEvents']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'End Date Time [List Events]',
                name: 'endDateTimeListEvents',
                type: 'string',
                description: 'End date time filter in ISO format',
                placeholder: '2024-12-31T23:59:59Z',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['listEvents']
                },
                additionalParams: true,
                optional: true
            },
            // Get Event Parameters
            {
                label: 'Event ID [Get Event]',
                name: 'eventIdGetEvent',
                type: 'string',
                description: 'ID of the event to retrieve',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['getEvent']
                },
                additionalParams: true,
                optional: true
            },
            // Create Event Parameters
            {
                label: 'Subject [Create Event]',
                name: 'subjectCreateEvent',
                type: 'string',
                description: 'Subject/title of the event',
                placeholder: 'Meeting Title',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['createEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Body [Create Event]',
                name: 'bodyCreateEvent',
                type: 'string',
                description: 'Body/description of the event',
                placeholder: 'Meeting description',
                rows: 3,
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['createEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Start Date Time [Create Event]',
                name: 'startDateTimeCreateEvent',
                type: 'string',
                description: 'Start date and time in ISO format',
                placeholder: '2024-01-15T10:00:00',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['createEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'End Date Time [Create Event]',
                name: 'endDateTimeCreateEvent',
                type: 'string',
                description: 'End date and time in ISO format',
                placeholder: '2024-01-15T11:00:00',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['createEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Time Zone [Create Event]',
                name: 'timeZoneCreateEvent',
                type: 'string',
                description: 'Time zone for the event',
                placeholder: 'UTC',
                default: 'UTC',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['createEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Location [Create Event]',
                name: 'locationCreateEvent',
                type: 'string',
                description: 'Location of the event',
                placeholder: 'Conference Room A',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['createEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Attendees [Create Event]',
                name: 'attendeesCreateEvent',
                type: 'string',
                description: 'Comma-separated list of attendee email addresses',
                placeholder: 'user1@example.com,user2@example.com',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['createEvent']
                },
                additionalParams: true,
                optional: true
            },
            // Update Event Parameters
            {
                label: 'Event ID [Update Event]',
                name: 'eventIdUpdateEvent',
                type: 'string',
                description: 'ID of the event to update',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Subject [Update Event]',
                name: 'subjectUpdateEvent',
                type: 'string',
                description: 'New subject/title of the event',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['updateEvent']
                },
                additionalParams: true,
                optional: true
            },
            // Delete Event Parameters
            {
                label: 'Event ID [Delete Event]',
                name: 'eventIdDeleteEvent',
                type: 'string',
                description: 'ID of the event to delete',
                show: {
                    outlookType: ['calendar'],
                    calendarActions: ['deleteEvent']
                },
                additionalParams: true,
                optional: true
            },
            // MESSAGE PARAMETERS
            // List Messages Parameters
            {
                label: 'Max Results [List Messages]',
                name: 'maxResultsListMessages',
                type: 'number',
                description: 'Maximum number of messages to return',
                default: 50,
                show: {
                    outlookType: ['message'],
                    messageActions: ['listMessages']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Filter [List Messages]',
                name: 'filterListMessages',
                type: 'string',
                description: 'Filter query (e.g., "isRead eq false")',
                show: {
                    outlookType: ['message'],
                    messageActions: ['listMessages']
                },
                additionalParams: true,
                optional: true
            },
            // Get Message Parameters
            {
                label: 'Message ID [Get Message]',
                name: 'messageIdGetMessage',
                type: 'string',
                description: 'ID of the message to retrieve',
                show: {
                    outlookType: ['message'],
                    messageActions: ['getMessage']
                },
                additionalParams: true,
                optional: true
            },
            // Create Draft Message Parameters
            {
                label: 'To [Create Draft Message]',
                name: 'toCreateDraftMessage',
                type: 'string',
                description: 'Recipient email address(es), comma-separated',
                placeholder: 'user@example.com',
                show: {
                    outlookType: ['message'],
                    messageActions: ['createDraftMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Subject [Create Draft Message]',
                name: 'subjectCreateDraftMessage',
                type: 'string',
                description: 'Subject of the message',
                placeholder: 'Email Subject',
                show: {
                    outlookType: ['message'],
                    messageActions: ['createDraftMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Body [Create Draft Message]',
                name: 'bodyCreateDraftMessage',
                type: 'string',
                description: 'Body content of the message',
                placeholder: 'Email body content',
                rows: 4,
                show: {
                    outlookType: ['message'],
                    messageActions: ['createDraftMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'CC [Create Draft Message]',
                name: 'ccCreateDraftMessage',
                type: 'string',
                description: 'CC email address(es), comma-separated',
                placeholder: 'cc@example.com',
                show: {
                    outlookType: ['message'],
                    messageActions: ['createDraftMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'BCC [Create Draft Message]',
                name: 'bccCreateDraftMessage',
                type: 'string',
                description: 'BCC email address(es), comma-separated',
                placeholder: 'bcc@example.com',
                show: {
                    outlookType: ['message'],
                    messageActions: ['createDraftMessage']
                },
                additionalParams: true,
                optional: true
            },
            // Send Message Parameters
            {
                label: 'To [Send Message]',
                name: 'toSendMessage',
                type: 'string',
                description: 'Recipient email address(es), comma-separated',
                placeholder: 'user@example.com',
                show: {
                    outlookType: ['message'],
                    messageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Subject [Send Message]',
                name: 'subjectSendMessage',
                type: 'string',
                description: 'Subject of the message',
                placeholder: 'Email Subject',
                show: {
                    outlookType: ['message'],
                    messageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Body [Send Message]',
                name: 'bodySendMessage',
                type: 'string',
                description: 'Body content of the message',
                placeholder: 'Email body content',
                rows: 4,
                show: {
                    outlookType: ['message'],
                    messageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            // Update Message Parameters
            {
                label: 'Message ID [Update Message]',
                name: 'messageIdUpdateMessage',
                type: 'string',
                description: 'ID of the message to update',
                show: {
                    outlookType: ['message'],
                    messageActions: ['updateMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Is Read [Update Message]',
                name: 'isReadUpdateMessage',
                type: 'boolean',
                description: 'Mark message as read/unread',
                show: {
                    outlookType: ['message'],
                    messageActions: ['updateMessage']
                },
                additionalParams: true,
                optional: true
            },
            // Delete Message Parameters
            {
                label: 'Message ID [Delete Message]',
                name: 'messageIdDeleteMessage',
                type: 'string',
                description: 'ID of the message to delete',
                show: {
                    outlookType: ['message'],
                    messageActions: ['deleteMessage']
                },
                additionalParams: true,
                optional: true
            },
            // Copy Message Parameters
            {
                label: 'Message ID [Copy Message]',
                name: 'messageIdCopyMessage',
                type: 'string',
                description: 'ID of the message to copy',
                show: {
                    outlookType: ['message'],
                    messageActions: ['copyMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Destination Folder ID [Copy Message]',
                name: 'destinationFolderIdCopyMessage',
                type: 'string',
                description: 'ID of the destination folder',
                show: {
                    outlookType: ['message'],
                    messageActions: ['copyMessage']
                },
                additionalParams: true,
                optional: true
            },
            // Move Message Parameters
            {
                label: 'Message ID [Move Message]',
                name: 'messageIdMoveMessage',
                type: 'string',
                description: 'ID of the message to move',
                show: {
                    outlookType: ['message'],
                    messageActions: ['moveMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Destination Folder ID [Move Message]',
                name: 'destinationFolderIdMoveMessage',
                type: 'string',
                description: 'ID of the destination folder',
                show: {
                    outlookType: ['message'],
                    messageActions: ['moveMessage']
                },
                additionalParams: true,
                optional: true
            },
            // Reply Message Parameters
            {
                label: 'Message ID [Reply Message]',
                name: 'messageIdReplyMessage',
                type: 'string',
                description: 'ID of the message to reply to',
                show: {
                    outlookType: ['message'],
                    messageActions: ['replyMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Reply Body [Reply Message]',
                name: 'replyBodyReplyMessage',
                type: 'string',
                description: 'Reply message body',
                rows: 4,
                show: {
                    outlookType: ['message'],
                    messageActions: ['replyMessage']
                },
                additionalParams: true,
                optional: true
            },
            // Forward Message Parameters
            {
                label: 'Message ID [Forward Message]',
                name: 'messageIdForwardMessage',
                type: 'string',
                description: 'ID of the message to forward',
                show: {
                    outlookType: ['message'],
                    messageActions: ['forwardMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Forward To [Forward Message]',
                name: 'forwardToForwardMessage',
                type: 'string',
                description: 'Email address(es) to forward to, comma-separated',
                show: {
                    outlookType: ['message'],
                    messageActions: ['forwardMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Forward Comment [Forward Message]',
                name: 'forwardCommentForwardMessage',
                type: 'string',
                description: 'Additional comment to include with forward',
                rows: 2,
                show: {
                    outlookType: ['message'],
                    messageActions: ['forwardMessage']
                },
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const outlookType = nodeData.inputs?.outlookType as string
        const calendarActions = nodeData.inputs?.calendarActions as string
        const messageActions = nodeData.inputs?.messageActions as string

        let credentialData = await getCredentialData(nodeData.credential ?? '', options)
        credentialData = await refreshOAuth2Token(nodeData.credential ?? '', credentialData, options)
        const accessToken = getCredentialParam('access_token', credentialData, nodeData)

        if (!accessToken) {
            throw new Error('No access token found in credential')
        }

        let actions: string[] = []
        if (outlookType === 'calendar') {
            actions = convertMultiOptionsToStringArray(calendarActions)
        } else if (outlookType === 'message') {
            actions = convertMultiOptionsToStringArray(messageActions)
        }

        // Prepare default parameters for each action based on type
        const defaultParams: ICommonObject = {}

        if (outlookType === 'calendar') {
            // Map calendar actions to their parameters
            actions.forEach((action) => {
                defaultParams[action] = {}

                switch (action) {
                    case 'listCalendars':
                        if (nodeData.inputs?.maxResultsListCalendars) {
                            defaultParams[action].maxResults = nodeData.inputs.maxResultsListCalendars
                        }
                        break

                    case 'getCalendar':
                        if (nodeData.inputs?.calendarIdGetCalendar) {
                            defaultParams[action].calendarId = nodeData.inputs.calendarIdGetCalendar
                        }
                        break

                    case 'createCalendar':
                        if (nodeData.inputs?.calendarNameCreateCalendar) {
                            defaultParams[action].calendarName = nodeData.inputs.calendarNameCreateCalendar
                        }
                        break

                    case 'updateCalendar':
                        if (nodeData.inputs?.calendarIdUpdateCalendar) {
                            defaultParams[action].calendarId = nodeData.inputs.calendarIdUpdateCalendar
                        }
                        if (nodeData.inputs?.calendarNameUpdateCalendar) {
                            defaultParams[action].calendarName = nodeData.inputs.calendarNameUpdateCalendar
                        }
                        break

                    case 'deleteCalendar':
                        if (nodeData.inputs?.calendarIdDeleteCalendar) {
                            defaultParams[action].calendarId = nodeData.inputs.calendarIdDeleteCalendar
                        }
                        break

                    case 'listEvents':
                        if (nodeData.inputs?.calendarIdListEvents) {
                            defaultParams[action].calendarId = nodeData.inputs.calendarIdListEvents
                        }
                        if (nodeData.inputs?.maxResultsListEvents) {
                            defaultParams[action].maxResults = nodeData.inputs.maxResultsListEvents
                        }
                        if (nodeData.inputs?.startDateTimeListEvents) {
                            defaultParams[action].startDateTime = nodeData.inputs.startDateTimeListEvents
                        }
                        if (nodeData.inputs?.endDateTimeListEvents) {
                            defaultParams[action].endDateTime = nodeData.inputs.endDateTimeListEvents
                        }
                        break

                    case 'getEvent':
                        if (nodeData.inputs?.eventIdGetEvent) {
                            defaultParams[action].eventId = nodeData.inputs.eventIdGetEvent
                        }
                        break

                    case 'createEvent':
                        if (nodeData.inputs?.subjectCreateEvent) {
                            defaultParams[action].subject = nodeData.inputs.subjectCreateEvent
                        }
                        if (nodeData.inputs?.bodyCreateEvent) {
                            defaultParams[action].body = nodeData.inputs.bodyCreateEvent
                        }
                        if (nodeData.inputs?.startDateTimeCreateEvent) {
                            defaultParams[action].startDateTime = nodeData.inputs.startDateTimeCreateEvent
                        }
                        if (nodeData.inputs?.endDateTimeCreateEvent) {
                            defaultParams[action].endDateTime = nodeData.inputs.endDateTimeCreateEvent
                        }
                        if (nodeData.inputs?.timeZoneCreateEvent) {
                            defaultParams[action].timeZone = nodeData.inputs.timeZoneCreateEvent
                        }
                        if (nodeData.inputs?.locationCreateEvent) {
                            defaultParams[action].location = nodeData.inputs.locationCreateEvent
                        }
                        if (nodeData.inputs?.attendeesCreateEvent) {
                            defaultParams[action].attendees = nodeData.inputs.attendeesCreateEvent
                        }
                        break

                    case 'updateEvent':
                        if (nodeData.inputs?.eventIdUpdateEvent) {
                            defaultParams[action].eventId = nodeData.inputs.eventIdUpdateEvent
                        }
                        if (nodeData.inputs?.subjectUpdateEvent) {
                            defaultParams[action].subject = nodeData.inputs.subjectUpdateEvent
                        }
                        break

                    case 'deleteEvent':
                        if (nodeData.inputs?.eventIdDeleteEvent) {
                            defaultParams[action].eventId = nodeData.inputs.eventIdDeleteEvent
                        }
                        break
                }
            })
        } else if (outlookType === 'message') {
            // Map message actions to their parameters
            actions.forEach((action) => {
                defaultParams[action] = {}

                switch (action) {
                    case 'listMessages':
                        if (nodeData.inputs?.maxResultsListMessages) {
                            defaultParams[action].maxResults = nodeData.inputs.maxResultsListMessages
                        }
                        if (nodeData.inputs?.filterListMessages) {
                            defaultParams[action].filter = nodeData.inputs.filterListMessages
                        }
                        break

                    case 'getMessage':
                        if (nodeData.inputs?.messageIdGetMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdGetMessage
                        }
                        break

                    case 'createDraftMessage':
                        if (nodeData.inputs?.toCreateDraftMessage) {
                            defaultParams[action].to = nodeData.inputs.toCreateDraftMessage
                        }
                        if (nodeData.inputs?.subjectCreateDraftMessage) {
                            defaultParams[action].subject = nodeData.inputs.subjectCreateDraftMessage
                        }
                        if (nodeData.inputs?.bodyCreateDraftMessage) {
                            defaultParams[action].body = nodeData.inputs.bodyCreateDraftMessage
                        }
                        if (nodeData.inputs?.ccCreateDraftMessage) {
                            defaultParams[action].cc = nodeData.inputs.ccCreateDraftMessage
                        }
                        if (nodeData.inputs?.bccCreateDraftMessage) {
                            defaultParams[action].bcc = nodeData.inputs.bccCreateDraftMessage
                        }
                        break

                    case 'sendMessage':
                        if (nodeData.inputs?.toSendMessage) {
                            defaultParams[action].to = nodeData.inputs.toSendMessage
                        }
                        if (nodeData.inputs?.subjectSendMessage) {
                            defaultParams[action].subject = nodeData.inputs.subjectSendMessage
                        }
                        if (nodeData.inputs?.bodySendMessage) {
                            defaultParams[action].body = nodeData.inputs.bodySendMessage
                        }
                        break

                    case 'updateMessage':
                        if (nodeData.inputs?.messageIdUpdateMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdUpdateMessage
                        }
                        if (nodeData.inputs?.isReadUpdateMessage !== undefined) {
                            defaultParams[action].isRead = nodeData.inputs.isReadUpdateMessage
                        }
                        break

                    case 'deleteMessage':
                        if (nodeData.inputs?.messageIdDeleteMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdDeleteMessage
                        }
                        break

                    case 'copyMessage':
                        if (nodeData.inputs?.messageIdCopyMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdCopyMessage
                        }
                        if (nodeData.inputs?.destinationFolderIdCopyMessage) {
                            defaultParams[action].destinationFolderId = nodeData.inputs.destinationFolderIdCopyMessage
                        }
                        break

                    case 'moveMessage':
                        if (nodeData.inputs?.messageIdMoveMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdMoveMessage
                        }
                        if (nodeData.inputs?.destinationFolderIdMoveMessage) {
                            defaultParams[action].destinationFolderId = nodeData.inputs.destinationFolderIdMoveMessage
                        }
                        break

                    case 'replyMessage':
                        if (nodeData.inputs?.messageIdReplyMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdReplyMessage
                        }
                        if (nodeData.inputs?.replyBodyReplyMessage) {
                            defaultParams[action].replyBody = nodeData.inputs.replyBodyReplyMessage
                        }
                        break

                    case 'forwardMessage':
                        if (nodeData.inputs?.messageIdForwardMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdForwardMessage
                        }
                        if (nodeData.inputs?.forwardToForwardMessage) {
                            defaultParams[action].forwardTo = nodeData.inputs.forwardToForwardMessage
                        }
                        if (nodeData.inputs?.forwardCommentForwardMessage) {
                            defaultParams[action].forwardComment = nodeData.inputs.forwardCommentForwardMessage
                        }
                        break
                }
            })
        }

        const outlookTools = createOutlookTools({
            accessToken,
            actions,
            defaultParams
        })

        return outlookTools
    }
}

module.exports = { nodeClass: MicrosoftOutlook_Tools }
