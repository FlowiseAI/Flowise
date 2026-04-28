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

        const defaultParams = this.transformNodeInputsToToolArgs(nodeData)

        const outlookTools = createOutlookTools({
            accessToken,
            actions,
            defaultParams
        })

        return outlookTools
    }

    transformNodeInputsToToolArgs(nodeData: INodeData): Record<string, any> {
        // Collect default parameters from inputs
        const defaultParams: Record<string, any> = {}

        // Calendar parameters
        if (nodeData.inputs?.maxResultsListCalendars) defaultParams.maxResultsListCalendars = nodeData.inputs.maxResultsListCalendars
        if (nodeData.inputs?.calendarIdGetCalendar) defaultParams.calendarIdGetCalendar = nodeData.inputs.calendarIdGetCalendar
        if (nodeData.inputs?.calendarNameCreateCalendar)
            defaultParams.calendarNameCreateCalendar = nodeData.inputs.calendarNameCreateCalendar
        if (nodeData.inputs?.calendarIdUpdateCalendar) defaultParams.calendarIdUpdateCalendar = nodeData.inputs.calendarIdUpdateCalendar
        if (nodeData.inputs?.calendarNameUpdateCalendar)
            defaultParams.calendarNameUpdateCalendar = nodeData.inputs.calendarNameUpdateCalendar
        if (nodeData.inputs?.calendarIdDeleteCalendar) defaultParams.calendarIdDeleteCalendar = nodeData.inputs.calendarIdDeleteCalendar
        if (nodeData.inputs?.calendarIdListEvents) defaultParams.calendarIdListEvents = nodeData.inputs.calendarIdListEvents
        if (nodeData.inputs?.maxResultsListEvents) defaultParams.maxResultsListEvents = nodeData.inputs.maxResultsListEvents
        if (nodeData.inputs?.startDateTimeListEvents) defaultParams.startDateTimeListEvents = nodeData.inputs.startDateTimeListEvents
        if (nodeData.inputs?.endDateTimeListEvents) defaultParams.endDateTimeListEvents = nodeData.inputs.endDateTimeListEvents
        if (nodeData.inputs?.eventIdGetEvent) defaultParams.eventIdGetEvent = nodeData.inputs.eventIdGetEvent
        if (nodeData.inputs?.subjectCreateEvent) defaultParams.subjectCreateEvent = nodeData.inputs.subjectCreateEvent
        if (nodeData.inputs?.bodyCreateEvent) defaultParams.bodyCreateEvent = nodeData.inputs.bodyCreateEvent
        if (nodeData.inputs?.startDateTimeCreateEvent) defaultParams.startDateTimeCreateEvent = nodeData.inputs.startDateTimeCreateEvent
        if (nodeData.inputs?.endDateTimeCreateEvent) defaultParams.endDateTimeCreateEvent = nodeData.inputs.endDateTimeCreateEvent
        if (nodeData.inputs?.timeZoneCreateEvent) defaultParams.timeZoneCreateEvent = nodeData.inputs.timeZoneCreateEvent
        if (nodeData.inputs?.locationCreateEvent) defaultParams.locationCreateEvent = nodeData.inputs.locationCreateEvent
        if (nodeData.inputs?.attendeesCreateEvent) defaultParams.attendeesCreateEvent = nodeData.inputs.attendeesCreateEvent
        if (nodeData.inputs?.eventIdUpdateEvent) defaultParams.eventIdUpdateEvent = nodeData.inputs.eventIdUpdateEvent
        if (nodeData.inputs?.subjectUpdateEvent) defaultParams.subjectUpdateEvent = nodeData.inputs.subjectUpdateEvent
        if (nodeData.inputs?.eventIdDeleteEvent) defaultParams.eventIdDeleteEvent = nodeData.inputs.eventIdDeleteEvent

        // Message parameters
        if (nodeData.inputs?.maxResultsListMessages) defaultParams.maxResultsListMessages = nodeData.inputs.maxResultsListMessages
        if (nodeData.inputs?.filterListMessages) defaultParams.filterListMessages = nodeData.inputs.filterListMessages
        if (nodeData.inputs?.messageIdGetMessage) defaultParams.messageIdGetMessage = nodeData.inputs.messageIdGetMessage
        if (nodeData.inputs?.toCreateDraftMessage) defaultParams.toCreateDraftMessage = nodeData.inputs.toCreateDraftMessage
        if (nodeData.inputs?.subjectCreateDraftMessage) defaultParams.subjectCreateDraftMessage = nodeData.inputs.subjectCreateDraftMessage
        if (nodeData.inputs?.bodyCreateDraftMessage) defaultParams.bodyCreateDraftMessage = nodeData.inputs.bodyCreateDraftMessage
        if (nodeData.inputs?.ccCreateDraftMessage) defaultParams.ccCreateDraftMessage = nodeData.inputs.ccCreateDraftMessage
        if (nodeData.inputs?.bccCreateDraftMessage) defaultParams.bccCreateDraftMessage = nodeData.inputs.bccCreateDraftMessage
        if (nodeData.inputs?.toSendMessage) defaultParams.toSendMessage = nodeData.inputs.toSendMessage
        if (nodeData.inputs?.subjectSendMessage) defaultParams.subjectSendMessage = nodeData.inputs.subjectSendMessage
        if (nodeData.inputs?.bodySendMessage) defaultParams.bodySendMessage = nodeData.inputs.bodySendMessage
        if (nodeData.inputs?.messageIdUpdateMessage) defaultParams.messageIdUpdateMessage = nodeData.inputs.messageIdUpdateMessage
        if (nodeData.inputs?.isReadUpdateMessage !== undefined) defaultParams.isReadUpdateMessage = nodeData.inputs.isReadUpdateMessage
        if (nodeData.inputs?.messageIdDeleteMessage) defaultParams.messageIdDeleteMessage = nodeData.inputs.messageIdDeleteMessage
        if (nodeData.inputs?.messageIdCopyMessage) defaultParams.messageIdCopyMessage = nodeData.inputs.messageIdCopyMessage
        if (nodeData.inputs?.destinationFolderIdCopyMessage)
            defaultParams.destinationFolderIdCopyMessage = nodeData.inputs.destinationFolderIdCopyMessage
        if (nodeData.inputs?.messageIdMoveMessage) defaultParams.messageIdMoveMessage = nodeData.inputs.messageIdMoveMessage
        if (nodeData.inputs?.destinationFolderIdMoveMessage)
            defaultParams.destinationFolderIdMoveMessage = nodeData.inputs.destinationFolderIdMoveMessage
        if (nodeData.inputs?.messageIdReplyMessage) defaultParams.messageIdReplyMessage = nodeData.inputs.messageIdReplyMessage
        if (nodeData.inputs?.replyBodyReplyMessage) defaultParams.replyBodyReplyMessage = nodeData.inputs.replyBodyReplyMessage
        if (nodeData.inputs?.messageIdForwardMessage) defaultParams.messageIdForwardMessage = nodeData.inputs.messageIdForwardMessage
        if (nodeData.inputs?.forwardToForwardMessage) defaultParams.forwardToForwardMessage = nodeData.inputs.forwardToForwardMessage
        if (nodeData.inputs?.forwardCommentForwardMessage)
            defaultParams.forwardCommentForwardMessage = nodeData.inputs.forwardCommentForwardMessage

        return defaultParams
    }
}

module.exports = { nodeClass: MicrosoftOutlook_Tools }
