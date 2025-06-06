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

        // Prepare default parameters for each action
        const defaultParams: ICommonObject = {}

        // Draft parameters
        const draftMaxResults = nodeData.inputs?.draftMaxResults
        const draftTo = nodeData.inputs?.draftTo
        const draftSubject = nodeData.inputs?.draftSubject
        const draftBody = nodeData.inputs?.draftBody
        const draftCc = nodeData.inputs?.draftCc
        const draftBcc = nodeData.inputs?.draftBcc
        const draftId = nodeData.inputs?.draftId
        const draftUpdateTo = nodeData.inputs?.draftUpdateTo
        const draftUpdateSubject = nodeData.inputs?.draftUpdateSubject
        const draftUpdateBody = nodeData.inputs?.draftUpdateBody

        // Message parameters
        const messageMaxResults = nodeData.inputs?.messageMaxResults
        const messageQuery = nodeData.inputs?.messageQuery
        const messageTo = nodeData.inputs?.messageTo
        const messageSubject = nodeData.inputs?.messageSubject
        const messageBody = nodeData.inputs?.messageBody
        const messageCc = nodeData.inputs?.messageCc
        const messageBcc = nodeData.inputs?.messageBcc
        const messageId = nodeData.inputs?.messageId
        const messageAddLabelIds = nodeData.inputs?.messageAddLabelIds
        const messageRemoveLabelIds = nodeData.inputs?.messageRemoveLabelIds

        // Label parameters
        const labelName = nodeData.inputs?.labelName
        const labelColor = nodeData.inputs?.labelColor
        const labelId = nodeData.inputs?.labelId

        // Thread parameters
        const threadMaxResults = nodeData.inputs?.threadMaxResults
        const threadQuery = nodeData.inputs?.threadQuery
        const threadId = nodeData.inputs?.threadId
        const threadAddLabelIds = nodeData.inputs?.threadAddLabelIds
        const threadRemoveLabelIds = nodeData.inputs?.threadRemoveLabelIds

        // Set default parameters based on actions
        actions.forEach((action) => {
            const params: ICommonObject = {}

            // Draft action parameters
            if (action.startsWith('list') && draftMaxResults) params.maxResults = draftMaxResults
            if (action === 'createDraft') {
                if (draftTo) params.to = draftTo
                if (draftSubject) params.subject = draftSubject
                if (draftBody) params.body = draftBody
                if (draftCc) params.cc = draftCc
                if (draftBcc) params.bcc = draftBcc
            }
            if (action === 'updateDraft') {
                if (draftId) params.draftId = draftId
                if (draftUpdateTo) params.to = draftUpdateTo
                if (draftUpdateSubject) params.subject = draftUpdateSubject
                if (draftUpdateBody) params.body = draftUpdateBody
            }
            if (['getDraft', 'sendDraft', 'deleteDraft'].includes(action) && draftId) {
                params.draftId = draftId
            }

            // Message action parameters
            if (action === 'listMessages') {
                if (messageMaxResults) params.maxResults = messageMaxResults
                if (messageQuery) params.query = messageQuery
            }
            if (action === 'sendMessage') {
                if (messageTo) params.to = messageTo
                if (messageSubject) params.subject = messageSubject
                if (messageBody) params.body = messageBody
                if (messageCc) params.cc = messageCc
                if (messageBcc) params.bcc = messageBcc
            }
            if (['getMessage', 'trashMessage', 'untrashMessage', 'deleteMessage'].includes(action) && messageId) {
                params.messageId = messageId
            }
            if (action === 'modifyMessage') {
                if (messageId) params.messageId = messageId
                if (messageAddLabelIds) params.addLabelIds = messageAddLabelIds.split(',').map((id: string) => id.trim())
                if (messageRemoveLabelIds) params.removeLabelIds = messageRemoveLabelIds.split(',').map((id: string) => id.trim())
            }

            // Label action parameters
            if (action === 'createLabel') {
                if (labelName) params.labelName = labelName
                if (labelColor) params.labelColor = labelColor
            }
            if (['getLabel', 'updateLabel', 'deleteLabel'].includes(action) && labelId) {
                params.labelId = labelId
            }
            if (action === 'updateLabel') {
                if (labelName) params.labelName = labelName
                if (labelColor) params.labelColor = labelColor
            }

            // Thread action parameters
            if (action === 'listThreads') {
                if (threadMaxResults) params.maxResults = threadMaxResults
                if (threadQuery) params.query = threadQuery
            }
            if (['getThread', 'trashThread', 'untrashThread', 'deleteThread'].includes(action) && threadId) {
                params.threadId = threadId
            }
            if (action === 'modifyThread') {
                if (threadId) params.threadId = threadId
                if (threadAddLabelIds) params.addLabelIds = threadAddLabelIds.split(',').map((id: string) => id.trim())
                if (threadRemoveLabelIds) params.removeLabelIds = threadRemoveLabelIds.split(',').map((id: string) => id.trim())
            }

            defaultParams[action] = params
        })

        // Create and return tools based on selected actions
        const tools = createGmailTools({
            actions,
            accessToken,
            defaultParams
        })

        return tools
    }
}

module.exports = { nodeClass: Gmail_Tools }
