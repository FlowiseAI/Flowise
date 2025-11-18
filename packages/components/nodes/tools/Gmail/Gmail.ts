import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam, refreshOAuth2Token } from '../../../src/utils'
import { createGmailTools } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class Gmail_Tools implements INode {
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
        this.label = 'Gmail'
        this.name = 'gmail'
        this.version = 1.0
        this.type = 'Gmail'
        this.icon = 'gmail.svg'
        this.category = 'Tools'
        this.description = 'Perform Gmail operations for drafts, messages, labels, and threads'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['gmailOAuth2']
        }
        this.inputs = [
            {
                label: 'Type',
                name: 'gmailType',
                type: 'options',
                options: [
                    {
                        label: 'Drafts',
                        name: 'drafts'
                    },
                    {
                        label: 'Messages',
                        name: 'messages'
                    },
                    {
                        label: 'Labels',
                        name: 'labels'
                    },
                    {
                        label: 'Threads',
                        name: 'threads'
                    }
                ]
            },
            // Draft Actions
            {
                label: 'Draft Actions',
                name: 'draftActions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'List Drafts',
                        name: 'listDrafts'
                    },
                    {
                        label: 'Create Draft',
                        name: 'createDraft'
                    },
                    {
                        label: 'Get Draft',
                        name: 'getDraft'
                    },
                    {
                        label: 'Update Draft',
                        name: 'updateDraft'
                    },
                    {
                        label: 'Send Draft',
                        name: 'sendDraft'
                    },
                    {
                        label: 'Delete Draft',
                        name: 'deleteDraft'
                    }
                ],
                show: {
                    gmailType: ['drafts']
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
                        label: 'Send Message',
                        name: 'sendMessage'
                    },
                    {
                        label: 'Modify Message',
                        name: 'modifyMessage'
                    },
                    {
                        label: 'Trash Message',
                        name: 'trashMessage'
                    },
                    {
                        label: 'Untrash Message',
                        name: 'untrashMessage'
                    },
                    {
                        label: 'Delete Message',
                        name: 'deleteMessage'
                    }
                ],
                show: {
                    gmailType: ['messages']
                }
            },
            // Label Actions
            {
                label: 'Label Actions',
                name: 'labelActions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'List Labels',
                        name: 'listLabels'
                    },
                    {
                        label: 'Get Label',
                        name: 'getLabel'
                    },
                    {
                        label: 'Create Label',
                        name: 'createLabel'
                    },
                    {
                        label: 'Update Label',
                        name: 'updateLabel'
                    },
                    {
                        label: 'Delete Label',
                        name: 'deleteLabel'
                    }
                ],
                show: {
                    gmailType: ['labels']
                }
            },
            // Thread Actions
            {
                label: 'Thread Actions',
                name: 'threadActions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'List Threads',
                        name: 'listThreads'
                    },
                    {
                        label: 'Get Thread',
                        name: 'getThread'
                    },
                    {
                        label: 'Modify Thread',
                        name: 'modifyThread'
                    },
                    {
                        label: 'Trash Thread',
                        name: 'trashThread'
                    },
                    {
                        label: 'Untrash Thread',
                        name: 'untrashThread'
                    },
                    {
                        label: 'Delete Thread',
                        name: 'deleteThread'
                    }
                ],
                show: {
                    gmailType: ['threads']
                }
            },
            // DRAFT PARAMETERS
            // List Drafts Parameters
            {
                label: 'Max Results',
                name: 'draftMaxResults',
                type: 'number',
                description: 'Maximum number of drafts to return',
                default: 100,
                show: {
                    draftActions: ['listDrafts']
                },
                additionalParams: true,
                optional: true
            },
            // Create Draft Parameters
            {
                label: 'To',
                name: 'draftTo',
                type: 'string',
                description: 'Recipient email address(es), comma-separated',
                placeholder: 'user1@example.com,user2@example.com',
                show: {
                    draftActions: ['createDraft']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Subject',
                name: 'draftSubject',
                type: 'string',
                description: 'Email subject',
                placeholder: 'Email Subject',
                show: {
                    draftActions: ['createDraft']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Body',
                name: 'draftBody',
                type: 'string',
                description: 'Email body content',
                placeholder: 'Email content',
                rows: 4,
                show: {
                    draftActions: ['createDraft']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'CC',
                name: 'draftCc',
                type: 'string',
                description: 'CC email address(es), comma-separated',
                placeholder: 'cc1@example.com,cc2@example.com',
                show: {
                    draftActions: ['createDraft']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'BCC',
                name: 'draftBcc',
                type: 'string',
                description: 'BCC email address(es), comma-separated',
                placeholder: 'bcc1@example.com,bcc2@example.com',
                show: {
                    draftActions: ['createDraft']
                },
                additionalParams: true,
                optional: true
            },
            // Draft ID for Get/Update/Send/Delete
            {
                label: 'Draft ID',
                name: 'draftId',
                type: 'string',
                description: 'ID of the draft',
                show: {
                    draftActions: ['getDraft', 'updateDraft', 'sendDraft', 'deleteDraft']
                },
                additionalParams: true,
                optional: true
            },
            // Update Draft Parameters
            {
                label: 'To (Update)',
                name: 'draftUpdateTo',
                type: 'string',
                description: 'Recipient email address(es), comma-separated',
                placeholder: 'user1@example.com,user2@example.com',
                show: {
                    draftActions: ['updateDraft']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Subject (Update)',
                name: 'draftUpdateSubject',
                type: 'string',
                description: 'Email subject',
                placeholder: 'Email Subject',
                show: {
                    draftActions: ['updateDraft']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Body (Update)',
                name: 'draftUpdateBody',
                type: 'string',
                description: 'Email body content',
                placeholder: 'Email content',
                rows: 4,
                show: {
                    draftActions: ['updateDraft']
                },
                additionalParams: true,
                optional: true
            },
            // MESSAGE PARAMETERS
            // List Messages Parameters
            {
                label: 'Max Results',
                name: 'messageMaxResults',
                type: 'number',
                description: 'Maximum number of messages to return',
                default: 100,
                show: {
                    messageActions: ['listMessages']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Query',
                name: 'messageQuery',
                type: 'string',
                description: 'Query string for filtering results (Gmail search syntax)',
                placeholder: 'is:unread from:example@gmail.com',
                show: {
                    messageActions: ['listMessages']
                },
                additionalParams: true,
                optional: true
            },
            // Send Message Parameters
            {
                label: 'To',
                name: 'messageTo',
                type: 'string',
                description: 'Recipient email address(es), comma-separated',
                placeholder: 'user1@example.com,user2@example.com',
                show: {
                    messageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Subject',
                name: 'messageSubject',
                type: 'string',
                description: 'Email subject',
                placeholder: 'Email Subject',
                show: {
                    messageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Body',
                name: 'messageBody',
                type: 'string',
                description: 'Email body content',
                placeholder: 'Email content',
                rows: 4,
                show: {
                    messageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'CC',
                name: 'messageCc',
                type: 'string',
                description: 'CC email address(es), comma-separated',
                placeholder: 'cc1@example.com,cc2@example.com',
                show: {
                    messageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'BCC',
                name: 'messageBcc',
                type: 'string',
                description: 'BCC email address(es), comma-separated',
                placeholder: 'bcc1@example.com,bcc2@example.com',
                show: {
                    messageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            // Message ID for Get/Modify/Trash/Untrash/Delete
            {
                label: 'Message ID',
                name: 'messageId',
                type: 'string',
                description: 'ID of the message',
                show: {
                    messageActions: ['getMessage', 'modifyMessage', 'trashMessage', 'untrashMessage', 'deleteMessage']
                },
                additionalParams: true,
                optional: true
            },
            // Message Label Modification
            {
                label: 'Add Label IDs',
                name: 'messageAddLabelIds',
                type: 'string',
                description: 'Comma-separated label IDs to add',
                placeholder: 'INBOX,STARRED',
                show: {
                    messageActions: ['modifyMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Remove Label IDs',
                name: 'messageRemoveLabelIds',
                type: 'string',
                description: 'Comma-separated label IDs to remove',
                placeholder: 'UNREAD,SPAM',
                show: {
                    messageActions: ['modifyMessage']
                },
                additionalParams: true,
                optional: true
            },
            // LABEL PARAMETERS
            // Create Label Parameters
            {
                label: 'Label Name',
                name: 'labelName',
                type: 'string',
                description: 'Name of the label',
                placeholder: 'Important',
                show: {
                    labelActions: ['createLabel', 'updateLabel']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Label Color',
                name: 'labelColor',
                type: 'string',
                description: 'Color of the label (hex color code)',
                placeholder: '#ff0000',
                show: {
                    labelActions: ['createLabel', 'updateLabel']
                },
                additionalParams: true,
                optional: true
            },
            // Label ID for Get/Update/Delete
            {
                label: 'Label ID',
                name: 'labelId',
                type: 'string',
                description: 'ID of the label',
                show: {
                    labelActions: ['getLabel', 'updateLabel', 'deleteLabel']
                },
                additionalParams: true,
                optional: true
            },
            // THREAD PARAMETERS
            // List Threads Parameters
            {
                label: 'Max Results',
                name: 'threadMaxResults',
                type: 'number',
                description: 'Maximum number of threads to return',
                default: 100,
                show: {
                    threadActions: ['listThreads']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Query',
                name: 'threadQuery',
                type: 'string',
                description: 'Query string for filtering results (Gmail search syntax)',
                placeholder: 'is:unread from:example@gmail.com',
                show: {
                    threadActions: ['listThreads']
                },
                additionalParams: true,
                optional: true
            },
            // Thread ID for Get/Modify/Trash/Untrash/Delete
            {
                label: 'Thread ID',
                name: 'threadId',
                type: 'string',
                description: 'ID of the thread',
                show: {
                    threadActions: ['getThread', 'modifyThread', 'trashThread', 'untrashThread', 'deleteThread']
                },
                additionalParams: true,
                optional: true
            },
            // Thread Label Modification
            {
                label: 'Add Label IDs',
                name: 'threadAddLabelIds',
                type: 'string',
                description: 'Comma-separated label IDs to add',
                placeholder: 'INBOX,STARRED',
                show: {
                    threadActions: ['modifyThread']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Remove Label IDs',
                name: 'threadRemoveLabelIds',
                type: 'string',
                description: 'Comma-separated label IDs to remove',
                placeholder: 'UNREAD,SPAM',
                show: {
                    threadActions: ['modifyThread']
                },
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        let credentialData = await getCredentialData(nodeData.credential ?? '', options)
        credentialData = await refreshOAuth2Token(nodeData.credential ?? '', credentialData, options)
        const accessToken = getCredentialParam('access_token', credentialData, nodeData)

        if (!accessToken) {
            throw new Error('No access token found in credential')
        }

        // Get all actions based on type
        const gmailType = nodeData.inputs?.gmailType as string
        let actions: string[] = []

        if (gmailType === 'drafts') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.draftActions)
        } else if (gmailType === 'messages') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.messageActions)
        } else if (gmailType === 'labels') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.labelActions)
        } else if (gmailType === 'threads') {
            actions = convertMultiOptionsToStringArray(nodeData.inputs?.threadActions)
        }

        const defaultParams = this.transformNodeInputsToToolArgs(nodeData)

        // Create and return tools based on selected actions
        const tools = createGmailTools({
            actions,
            accessToken,
            defaultParams
        })

        return tools
    }

    transformNodeInputsToToolArgs(nodeData: INodeData): Record<string, any> {
        // Collect default parameters from inputs
        const defaultParams: Record<string, any> = {}

        // Draft parameters
        if (nodeData.inputs?.draftMaxResults) defaultParams.draftMaxResults = nodeData.inputs.draftMaxResults
        if (nodeData.inputs?.draftTo) defaultParams.draftTo = nodeData.inputs.draftTo
        if (nodeData.inputs?.draftSubject) defaultParams.draftSubject = nodeData.inputs.draftSubject
        if (nodeData.inputs?.draftBody) defaultParams.draftBody = nodeData.inputs.draftBody
        if (nodeData.inputs?.draftCc) defaultParams.draftCc = nodeData.inputs.draftCc
        if (nodeData.inputs?.draftBcc) defaultParams.draftBcc = nodeData.inputs.draftBcc
        if (nodeData.inputs?.draftId) defaultParams.draftId = nodeData.inputs.draftId
        if (nodeData.inputs?.draftUpdateTo) defaultParams.draftUpdateTo = nodeData.inputs.draftUpdateTo
        if (nodeData.inputs?.draftUpdateSubject) defaultParams.draftUpdateSubject = nodeData.inputs.draftUpdateSubject
        if (nodeData.inputs?.draftUpdateBody) defaultParams.draftUpdateBody = nodeData.inputs.draftUpdateBody

        // Message parameters
        if (nodeData.inputs?.messageMaxResults) defaultParams.messageMaxResults = nodeData.inputs.messageMaxResults
        if (nodeData.inputs?.messageQuery) defaultParams.messageQuery = nodeData.inputs.messageQuery
        if (nodeData.inputs?.messageTo) defaultParams.messageTo = nodeData.inputs.messageTo
        if (nodeData.inputs?.messageSubject) defaultParams.messageSubject = nodeData.inputs.messageSubject
        if (nodeData.inputs?.messageBody) defaultParams.messageBody = nodeData.inputs.messageBody
        if (nodeData.inputs?.messageCc) defaultParams.messageCc = nodeData.inputs.messageCc
        if (nodeData.inputs?.messageBcc) defaultParams.messageBcc = nodeData.inputs.messageBcc
        if (nodeData.inputs?.messageId) defaultParams.messageId = nodeData.inputs.messageId
        if (nodeData.inputs?.messageAddLabelIds) defaultParams.messageAddLabelIds = nodeData.inputs.messageAddLabelIds
        if (nodeData.inputs?.messageRemoveLabelIds) defaultParams.messageRemoveLabelIds = nodeData.inputs.messageRemoveLabelIds

        // Label parameters
        if (nodeData.inputs?.labelName) defaultParams.labelName = nodeData.inputs.labelName
        if (nodeData.inputs?.labelColor) defaultParams.labelColor = nodeData.inputs.labelColor
        if (nodeData.inputs?.labelId) defaultParams.labelId = nodeData.inputs.labelId

        // Thread parameters
        if (nodeData.inputs?.threadMaxResults) defaultParams.threadMaxResults = nodeData.inputs.threadMaxResults
        if (nodeData.inputs?.threadQuery) defaultParams.threadQuery = nodeData.inputs.threadQuery
        if (nodeData.inputs?.threadId) defaultParams.threadId = nodeData.inputs.threadId
        if (nodeData.inputs?.threadAddLabelIds) defaultParams.threadAddLabelIds = nodeData.inputs.threadAddLabelIds
        if (nodeData.inputs?.threadRemoveLabelIds) defaultParams.threadRemoveLabelIds = nodeData.inputs.threadRemoveLabelIds

        return defaultParams
    }
}

module.exports = { nodeClass: Gmail_Tools }
