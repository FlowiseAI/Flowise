import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam, refreshOAuth2Token } from '../../../src/utils'
import { createTeamsTools } from './core'

class MicrosoftTeams_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'Microsoft Teams'
        this.name = 'microsoftTeams'
        this.version = 1.0
        this.type = 'MicrosoftTeams'
        this.icon = 'teams.svg'
        this.category = 'Tools'
        this.description = 'Perform Microsoft Teams operations for channels, chats, and chat messages'
        this.baseClasses = [this.type, 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['microsoftTeamsOAuth2']
        }
        this.inputs = [
            {
                label: 'Type',
                name: 'teamsType',
                type: 'options',
                options: [
                    {
                        label: 'Channel',
                        name: 'channel'
                    },
                    {
                        label: 'Chat',
                        name: 'chat'
                    },
                    {
                        label: 'Chat Message',
                        name: 'chatMessage'
                    }
                ]
            },
            // Channel Actions
            {
                label: 'Channel Actions',
                name: 'channelActions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'List Channels',
                        name: 'listChannels'
                    },
                    {
                        label: 'Get Channel',
                        name: 'getChannel'
                    },
                    {
                        label: 'Create Channel',
                        name: 'createChannel'
                    },
                    {
                        label: 'Update Channel',
                        name: 'updateChannel'
                    },
                    {
                        label: 'Delete Channel',
                        name: 'deleteChannel'
                    },
                    {
                        label: 'Archive Channel',
                        name: 'archiveChannel'
                    },
                    {
                        label: 'Unarchive Channel',
                        name: 'unarchiveChannel'
                    },
                    {
                        label: 'List Channel Members',
                        name: 'listChannelMembers'
                    },
                    {
                        label: 'Add Channel Member',
                        name: 'addChannelMember'
                    },
                    {
                        label: 'Remove Channel Member',
                        name: 'removeChannelMember'
                    }
                ],
                show: {
                    teamsType: ['channel']
                }
            },
            // Chat Actions
            {
                label: 'Chat Actions',
                name: 'chatActions',
                type: 'multiOptions',
                options: [
                    {
                        label: 'List Chats',
                        name: 'listChats'
                    },
                    {
                        label: 'Get Chat',
                        name: 'getChat'
                    },
                    {
                        label: 'Create Chat',
                        name: 'createChat'
                    },
                    {
                        label: 'Update Chat',
                        name: 'updateChat'
                    },
                    {
                        label: 'Delete Chat',
                        name: 'deleteChat'
                    },
                    {
                        label: 'List Chat Members',
                        name: 'listChatMembers'
                    },
                    {
                        label: 'Add Chat Member',
                        name: 'addChatMember'
                    },
                    {
                        label: 'Remove Chat Member',
                        name: 'removeChatMember'
                    },
                    {
                        label: 'Pin Message',
                        name: 'pinMessage'
                    },
                    {
                        label: 'Unpin Message',
                        name: 'unpinMessage'
                    }
                ],
                show: {
                    teamsType: ['chat']
                }
            },
            // Chat Message Actions
            {
                label: 'Chat Message Actions',
                name: 'chatMessageActions',
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
                        label: 'Update Message',
                        name: 'updateMessage'
                    },
                    {
                        label: 'Delete Message',
                        name: 'deleteMessage'
                    },
                    {
                        label: 'Reply to Message',
                        name: 'replyToMessage'
                    },
                    {
                        label: 'Set Reaction',
                        name: 'setReaction'
                    },
                    {
                        label: 'Unset Reaction',
                        name: 'unsetReaction'
                    },
                    {
                        label: 'Get All Messages',
                        name: 'getAllMessages'
                    }
                ],
                show: {
                    teamsType: ['chatMessage']
                }
            },

            // CHANNEL PARAMETERS
            // List Channels Parameters
            {
                label: 'Team ID [List Channels]',
                name: 'teamIdListChannels',
                type: 'string',
                description: 'ID of the team to list channels from',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['listChannels']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Max Results [List Channels]',
                name: 'maxResultsListChannels',
                type: 'number',
                description: 'Maximum number of channels to return',
                default: 50,
                show: {
                    teamsType: ['channel'],
                    channelActions: ['listChannels']
                },
                additionalParams: true,
                optional: true
            },

            // Get Channel Parameters
            {
                label: 'Team ID [Get Channel]',
                name: 'teamIdGetChannel',
                type: 'string',
                description: 'ID of the team that contains the channel',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['getChannel']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Channel ID [Get Channel]',
                name: 'channelIdGetChannel',
                type: 'string',
                description: 'ID of the channel to retrieve',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['getChannel']
                },
                additionalParams: true,
                optional: true
            },

            // Create Channel Parameters
            {
                label: 'Team ID [Create Channel]',
                name: 'teamIdCreateChannel',
                type: 'string',
                description: 'ID of the team to create the channel in',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['createChannel']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Display Name [Create Channel]',
                name: 'displayNameCreateChannel',
                type: 'string',
                description: 'Display name of the channel',
                placeholder: 'My New Channel',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['createChannel']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Description [Create Channel]',
                name: 'descriptionCreateChannel',
                type: 'string',
                description: 'Description of the channel',
                placeholder: 'Channel description',
                rows: 2,
                show: {
                    teamsType: ['channel'],
                    channelActions: ['createChannel']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Membership Type [Create Channel]',
                name: 'membershipTypeCreateChannel',
                type: 'options',
                options: [
                    { label: 'Standard', name: 'standard' },
                    { label: 'Private', name: 'private' },
                    { label: 'Shared', name: 'shared' }
                ],
                default: 'standard',
                description: 'Type of channel membership',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['createChannel']
                },
                additionalParams: true,
                optional: true
            },

            // Update Channel Parameters
            {
                label: 'Team ID [Update Channel]',
                name: 'teamIdUpdateChannel',
                type: 'string',
                description: 'ID of the team that contains the channel',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['updateChannel']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Channel ID [Update Channel]',
                name: 'channelIdUpdateChannel',
                type: 'string',
                description: 'ID of the channel to update',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['updateChannel']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Display Name [Update Channel]',
                name: 'displayNameUpdateChannel',
                type: 'string',
                description: 'New display name of the channel',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['updateChannel']
                },
                additionalParams: true,
                optional: true
            },

            // Delete/Archive Channel Parameters
            {
                label: 'Team ID [Delete/Archive Channel]',
                name: 'teamIdDeleteChannel',
                type: 'string',
                description: 'ID of the team that contains the channel',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['deleteChannel', 'archiveChannel', 'unarchiveChannel']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Channel ID [Delete/Archive Channel]',
                name: 'channelIdDeleteChannel',
                type: 'string',
                description: 'ID of the channel to delete or archive',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['deleteChannel', 'archiveChannel', 'unarchiveChannel']
                },
                additionalParams: true,
                optional: true
            },

            // Channel Members Parameters
            {
                label: 'Team ID [Channel Members]',
                name: 'teamIdChannelMembers',
                type: 'string',
                description: 'ID of the team that contains the channel',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['listChannelMembers', 'addChannelMember', 'removeChannelMember']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Channel ID [Channel Members]',
                name: 'channelIdChannelMembers',
                type: 'string',
                description: 'ID of the channel',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['listChannelMembers', 'addChannelMember', 'removeChannelMember']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'User ID [Add/Remove Channel Member]',
                name: 'userIdChannelMember',
                type: 'string',
                description: 'ID of the user to add or remove',
                show: {
                    teamsType: ['channel'],
                    channelActions: ['addChannelMember', 'removeChannelMember']
                },
                additionalParams: true,
                optional: true
            },

            // CHAT PARAMETERS
            // List Chats Parameters
            {
                label: 'Max Results [List Chats]',
                name: 'maxResultsListChats',
                type: 'number',
                description: 'Maximum number of chats to return',
                default: 50,
                show: {
                    teamsType: ['chat'],
                    chatActions: ['listChats']
                },
                additionalParams: true,
                optional: true
            },

            // Get Chat Parameters
            {
                label: 'Chat ID [Get Chat]',
                name: 'chatIdGetChat',
                type: 'string',
                description: 'ID of the chat to retrieve',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['getChat']
                },
                additionalParams: true,
                optional: true
            },

            // Create Chat Parameters
            {
                label: 'Chat Type [Create Chat]',
                name: 'chatTypeCreateChat',
                type: 'options',
                options: [
                    { label: 'One on One', name: 'oneOnOne' },
                    { label: 'Group', name: 'group' }
                ],
                default: 'group',
                description: 'Type of chat to create',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['createChat']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Topic [Create Chat]',
                name: 'topicCreateChat',
                type: 'string',
                description: 'Topic/subject of the chat (for group chats)',
                placeholder: 'Chat topic',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['createChat']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Members [Create Chat]',
                name: 'membersCreateChat',
                type: 'string',
                description: 'Comma-separated list of user IDs to add to the chat',
                placeholder: 'user1@example.com,user2@example.com',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['createChat']
                },
                additionalParams: true,
                optional: true
            },

            // Update Chat Parameters
            {
                label: 'Chat ID [Update Chat]',
                name: 'chatIdUpdateChat',
                type: 'string',
                description: 'ID of the chat to update',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['updateChat']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Topic [Update Chat]',
                name: 'topicUpdateChat',
                type: 'string',
                description: 'New topic/subject of the chat',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['updateChat']
                },
                additionalParams: true,
                optional: true
            },

            // Delete Chat Parameters
            {
                label: 'Chat ID [Delete Chat]',
                name: 'chatIdDeleteChat',
                type: 'string',
                description: 'ID of the chat to delete',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['deleteChat']
                },
                additionalParams: true,
                optional: true
            },

            // Chat Members Parameters
            {
                label: 'Chat ID [Chat Members]',
                name: 'chatIdChatMembers',
                type: 'string',
                description: 'ID of the chat',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['listChatMembers', 'addChatMember', 'removeChatMember']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'User ID [Add/Remove Chat Member]',
                name: 'userIdChatMember',
                type: 'string',
                description: 'ID of the user to add or remove',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['addChatMember', 'removeChatMember']
                },
                additionalParams: true,
                optional: true
            },

            // Pin/Unpin Message Parameters
            {
                label: 'Chat ID [Pin/Unpin Message]',
                name: 'chatIdPinMessage',
                type: 'string',
                description: 'ID of the chat',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['pinMessage', 'unpinMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Message ID [Pin/Unpin Message]',
                name: 'messageIdPinMessage',
                type: 'string',
                description: 'ID of the message to pin or unpin',
                show: {
                    teamsType: ['chat'],
                    chatActions: ['pinMessage', 'unpinMessage']
                },
                additionalParams: true,
                optional: true
            },

            // CHAT MESSAGE PARAMETERS
            // List Messages Parameters
            {
                label: 'Chat/Channel ID [List Messages]',
                name: 'chatChannelIdListMessages',
                type: 'string',
                description: 'ID of the chat or channel to list messages from',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['listMessages']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Team ID [List Messages - Channel Only]',
                name: 'teamIdListMessages',
                type: 'string',
                description: 'ID of the team (required for channel messages)',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['listMessages']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Max Results [List Messages]',
                name: 'maxResultsListMessages',
                type: 'number',
                description: 'Maximum number of messages to return',
                default: 50,
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['listMessages']
                },
                additionalParams: true,
                optional: true
            },

            // Get Message Parameters
            {
                label: 'Chat/Channel ID [Get Message]',
                name: 'chatChannelIdGetMessage',
                type: 'string',
                description: 'ID of the chat or channel',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['getMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Team ID [Get Message - Channel Only]',
                name: 'teamIdGetMessage',
                type: 'string',
                description: 'ID of the team (required for channel messages)',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['getMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Message ID [Get Message]',
                name: 'messageIdGetMessage',
                type: 'string',
                description: 'ID of the message to retrieve',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['getMessage']
                },
                additionalParams: true,
                optional: true
            },

            // Send Message Parameters
            {
                label: 'Chat/Channel ID [Send Message]',
                name: 'chatChannelIdSendMessage',
                type: 'string',
                description: 'ID of the chat or channel to send message to',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Team ID [Send Message - Channel Only]',
                name: 'teamIdSendMessage',
                type: 'string',
                description: 'ID of the team (required for channel messages)',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Message Body [Send Message]',
                name: 'messageBodySendMessage',
                type: 'string',
                description: 'Content of the message',
                placeholder: 'Hello, this is a message!',
                rows: 4,
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Content Type [Send Message]',
                name: 'contentTypeSendMessage',
                type: 'options',
                options: [
                    { label: 'Text', name: 'text' },
                    { label: 'HTML', name: 'html' }
                ],
                default: 'text',
                description: 'Content type of the message',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['sendMessage']
                },
                additionalParams: true,
                optional: true
            },

            // Update Message Parameters
            {
                label: 'Chat/Channel ID [Update Message]',
                name: 'chatChannelIdUpdateMessage',
                type: 'string',
                description: 'ID of the chat or channel',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['updateMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Team ID [Update Message - Channel Only]',
                name: 'teamIdUpdateMessage',
                type: 'string',
                description: 'ID of the team (required for channel messages)',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['updateMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Message ID [Update Message]',
                name: 'messageIdUpdateMessage',
                type: 'string',
                description: 'ID of the message to update',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['updateMessage']
                },
                additionalParams: true,
                optional: true
            },

            // Delete Message Parameters
            {
                label: 'Chat/Channel ID [Delete Message]',
                name: 'chatChannelIdDeleteMessage',
                type: 'string',
                description: 'ID of the chat or channel',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['deleteMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Team ID [Delete Message - Channel Only]',
                name: 'teamIdDeleteMessage',
                type: 'string',
                description: 'ID of the team (required for channel messages)',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['deleteMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Message ID [Delete Message]',
                name: 'messageIdDeleteMessage',
                type: 'string',
                description: 'ID of the message to delete',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['deleteMessage']
                },
                additionalParams: true,
                optional: true
            },

            // Reply to Message Parameters
            {
                label: 'Chat/Channel ID [Reply to Message]',
                name: 'chatChannelIdReplyMessage',
                type: 'string',
                description: 'ID of the chat or channel',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['replyToMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Team ID [Reply to Message - Channel Only]',
                name: 'teamIdReplyMessage',
                type: 'string',
                description: 'ID of the team (required for channel messages)',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['replyToMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Message ID [Reply to Message]',
                name: 'messageIdReplyMessage',
                type: 'string',
                description: 'ID of the message to reply to',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['replyToMessage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Reply Body [Reply to Message]',
                name: 'replyBodyReplyMessage',
                type: 'string',
                description: 'Content of the reply',
                placeholder: 'This is my reply',
                rows: 3,
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['replyToMessage']
                },
                additionalParams: true,
                optional: true
            },

            // Set/Unset Reaction Parameters
            {
                label: 'Chat/Channel ID [Set/Unset Reaction]',
                name: 'chatChannelIdReaction',
                type: 'string',
                description: 'ID of the chat or channel',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['setReaction', 'unsetReaction']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Team ID [Set/Unset Reaction - Channel Only]',
                name: 'teamIdReaction',
                type: 'string',
                description: 'ID of the team (required for channel messages)',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['setReaction', 'unsetReaction']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Message ID [Set/Unset Reaction]',
                name: 'messageIdReaction',
                type: 'string',
                description: 'ID of the message to react to',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['setReaction', 'unsetReaction']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Reaction Type [Set Reaction]',
                name: 'reactionTypeSetReaction',
                type: 'options',
                options: [
                    { label: 'Like', name: 'like' },
                    { label: 'Heart', name: 'heart' },
                    { label: 'Laugh', name: 'laugh' },
                    { label: 'Surprised', name: 'surprised' },
                    { label: 'Sad', name: 'sad' },
                    { label: 'Angry', name: 'angry' }
                ],
                default: 'like',
                description: 'Type of reaction to set',
                show: {
                    teamsType: ['chatMessage'],
                    chatMessageActions: ['setReaction']
                },
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: any): Promise<any> {
        const teamsType = nodeData.inputs?.teamsType as string
        const channelActions = nodeData.inputs?.channelActions as string
        const chatActions = nodeData.inputs?.chatActions as string
        const chatMessageActions = nodeData.inputs?.chatMessageActions as string

        let actions: string[] = []
        if (teamsType === 'channel') {
            actions = convertMultiOptionsToStringArray(channelActions)
        } else if (teamsType === 'chat') {
            actions = convertMultiOptionsToStringArray(chatActions)
        } else if (teamsType === 'chatMessage') {
            actions = convertMultiOptionsToStringArray(chatMessageActions)
        }

        let credentialData = await getCredentialData(nodeData.credential ?? '', options)
        credentialData = await refreshOAuth2Token(nodeData.credential ?? '', credentialData, options)
        const accessToken = getCredentialParam('access_token', credentialData, nodeData)

        if (!accessToken) {
            throw new Error('No access token found in credential')
        }

        // Prepare default parameters for each action based on type
        const defaultParams: ICommonObject = {}

        if (teamsType === 'channel') {
            // Map channel actions to their parameters
            actions.forEach((action) => {
                defaultParams[action] = {}

                switch (action) {
                    case 'listChannels':
                        if (nodeData.inputs?.teamIdListChannels) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdListChannels
                        }
                        if (nodeData.inputs?.maxResultsListChannels) {
                            defaultParams[action].maxResults = nodeData.inputs.maxResultsListChannels
                        }
                        break

                    case 'getChannel':
                        if (nodeData.inputs?.teamIdGetChannel) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdGetChannel
                        }
                        if (nodeData.inputs?.channelIdGetChannel) {
                            defaultParams[action].channelId = nodeData.inputs.channelIdGetChannel
                        }
                        break

                    case 'createChannel':
                        if (nodeData.inputs?.teamIdCreateChannel) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdCreateChannel
                        }
                        if (nodeData.inputs?.displayNameCreateChannel) {
                            defaultParams[action].displayName = nodeData.inputs.displayNameCreateChannel
                        }
                        if (nodeData.inputs?.descriptionCreateChannel) {
                            defaultParams[action].description = nodeData.inputs.descriptionCreateChannel
                        }
                        if (nodeData.inputs?.membershipTypeCreateChannel) {
                            defaultParams[action].membershipType = nodeData.inputs.membershipTypeCreateChannel
                        }
                        break

                    case 'updateChannel':
                        if (nodeData.inputs?.teamIdUpdateChannel) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdUpdateChannel
                        }
                        if (nodeData.inputs?.channelIdUpdateChannel) {
                            defaultParams[action].channelId = nodeData.inputs.channelIdUpdateChannel
                        }
                        if (nodeData.inputs?.displayNameUpdateChannel) {
                            defaultParams[action].displayName = nodeData.inputs.displayNameUpdateChannel
                        }
                        break

                    case 'deleteChannel':
                    case 'archiveChannel':
                    case 'unarchiveChannel':
                        if (nodeData.inputs?.teamIdDeleteChannel) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdDeleteChannel
                        }
                        if (nodeData.inputs?.channelIdDeleteChannel) {
                            defaultParams[action].channelId = nodeData.inputs.channelIdDeleteChannel
                        }
                        break

                    case 'listChannelMembers':
                        if (nodeData.inputs?.teamIdChannelMembers) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdChannelMembers
                        }
                        if (nodeData.inputs?.channelIdChannelMembers) {
                            defaultParams[action].channelId = nodeData.inputs.channelIdChannelMembers
                        }
                        break

                    case 'addChannelMember':
                    case 'removeChannelMember':
                        if (nodeData.inputs?.teamIdChannelMembers) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdChannelMembers
                        }
                        if (nodeData.inputs?.channelIdChannelMembers) {
                            defaultParams[action].channelId = nodeData.inputs.channelIdChannelMembers
                        }
                        if (nodeData.inputs?.userIdChannelMember) {
                            defaultParams[action].userId = nodeData.inputs.userIdChannelMember
                        }
                        break
                }
            })
        } else if (teamsType === 'chat') {
            // Map chat actions to their parameters
            actions.forEach((action) => {
                defaultParams[action] = {}

                switch (action) {
                    case 'listChats':
                        if (nodeData.inputs?.maxResultsListChats) {
                            defaultParams[action].maxResults = nodeData.inputs.maxResultsListChats
                        }
                        break

                    case 'getChat':
                        if (nodeData.inputs?.chatIdGetChat) {
                            defaultParams[action].chatId = nodeData.inputs.chatIdGetChat
                        }
                        break

                    case 'createChat':
                        if (nodeData.inputs?.chatTypeCreateChat) {
                            defaultParams[action].chatType = nodeData.inputs.chatTypeCreateChat
                        }
                        if (nodeData.inputs?.topicCreateChat) {
                            defaultParams[action].topic = nodeData.inputs.topicCreateChat
                        }
                        if (nodeData.inputs?.membersCreateChat) {
                            defaultParams[action].members = nodeData.inputs.membersCreateChat
                        }
                        break

                    case 'updateChat':
                        if (nodeData.inputs?.chatIdUpdateChat) {
                            defaultParams[action].chatId = nodeData.inputs.chatIdUpdateChat
                        }
                        if (nodeData.inputs?.topicUpdateChat) {
                            defaultParams[action].topic = nodeData.inputs.topicUpdateChat
                        }
                        break

                    case 'deleteChat':
                        if (nodeData.inputs?.chatIdDeleteChat) {
                            defaultParams[action].chatId = nodeData.inputs.chatIdDeleteChat
                        }
                        break

                    case 'listChatMembers':
                        if (nodeData.inputs?.chatIdChatMembers) {
                            defaultParams[action].chatId = nodeData.inputs.chatIdChatMembers
                        }
                        break

                    case 'addChatMember':
                    case 'removeChatMember':
                        if (nodeData.inputs?.chatIdChatMembers) {
                            defaultParams[action].chatId = nodeData.inputs.chatIdChatMembers
                        }
                        if (nodeData.inputs?.userIdChatMember) {
                            defaultParams[action].userId = nodeData.inputs.userIdChatMember
                        }
                        break

                    case 'pinMessage':
                    case 'unpinMessage':
                        if (nodeData.inputs?.chatIdPinMessage) {
                            defaultParams[action].chatId = nodeData.inputs.chatIdPinMessage
                        }
                        if (nodeData.inputs?.messageIdPinMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdPinMessage
                        }
                        break
                }
            })
        } else if (teamsType === 'chatMessage') {
            // Map chat message actions to their parameters
            actions.forEach((action) => {
                defaultParams[action] = {}

                switch (action) {
                    case 'listMessages':
                        if (nodeData.inputs?.chatChannelIdListMessages) {
                            defaultParams[action].chatChannelId = nodeData.inputs.chatChannelIdListMessages
                        }
                        if (nodeData.inputs?.teamIdListMessages) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdListMessages
                        }
                        if (nodeData.inputs?.maxResultsListMessages) {
                            defaultParams[action].maxResults = nodeData.inputs.maxResultsListMessages
                        }
                        break

                    case 'getMessage':
                        if (nodeData.inputs?.chatChannelIdGetMessage) {
                            defaultParams[action].chatChannelId = nodeData.inputs.chatChannelIdGetMessage
                        }
                        if (nodeData.inputs?.teamIdGetMessage) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdGetMessage
                        }
                        if (nodeData.inputs?.messageIdGetMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdGetMessage
                        }
                        break

                    case 'sendMessage':
                        if (nodeData.inputs?.chatChannelIdSendMessage) {
                            defaultParams[action].chatChannelId = nodeData.inputs.chatChannelIdSendMessage
                        }
                        if (nodeData.inputs?.teamIdSendMessage) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdSendMessage
                        }
                        if (nodeData.inputs?.messageBodySendMessage) {
                            defaultParams[action].messageBody = nodeData.inputs.messageBodySendMessage
                        }
                        if (nodeData.inputs?.contentTypeSendMessage) {
                            defaultParams[action].contentType = nodeData.inputs.contentTypeSendMessage
                        }
                        break

                    case 'updateMessage':
                        if (nodeData.inputs?.chatChannelIdUpdateMessage) {
                            defaultParams[action].chatChannelId = nodeData.inputs.chatChannelIdUpdateMessage
                        }
                        if (nodeData.inputs?.teamIdUpdateMessage) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdUpdateMessage
                        }
                        if (nodeData.inputs?.messageIdUpdateMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdUpdateMessage
                        }
                        break

                    case 'deleteMessage':
                        if (nodeData.inputs?.chatChannelIdDeleteMessage) {
                            defaultParams[action].chatChannelId = nodeData.inputs.chatChannelIdDeleteMessage
                        }
                        if (nodeData.inputs?.teamIdDeleteMessage) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdDeleteMessage
                        }
                        if (nodeData.inputs?.messageIdDeleteMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdDeleteMessage
                        }
                        break

                    case 'replyToMessage':
                        if (nodeData.inputs?.chatChannelIdReplyMessage) {
                            defaultParams[action].chatChannelId = nodeData.inputs.chatChannelIdReplyMessage
                        }
                        if (nodeData.inputs?.teamIdReplyMessage) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdReplyMessage
                        }
                        if (nodeData.inputs?.messageIdReplyMessage) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdReplyMessage
                        }
                        if (nodeData.inputs?.replyBodyReplyMessage) {
                            defaultParams[action].replyBody = nodeData.inputs.replyBodyReplyMessage
                        }
                        break

                    case 'setReaction':
                        if (nodeData.inputs?.chatChannelIdReaction) {
                            defaultParams[action].chatChannelId = nodeData.inputs.chatChannelIdReaction
                        }
                        if (nodeData.inputs?.teamIdReaction) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdReaction
                        }
                        if (nodeData.inputs?.messageIdReaction) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdReaction
                        }
                        if (nodeData.inputs?.reactionTypeSetReaction) {
                            defaultParams[action].reactionType = nodeData.inputs.reactionTypeSetReaction
                        }
                        break

                    case 'unsetReaction':
                        if (nodeData.inputs?.chatChannelIdReaction) {
                            defaultParams[action].chatChannelId = nodeData.inputs.chatChannelIdReaction
                        }
                        if (nodeData.inputs?.teamIdReaction) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdReaction
                        }
                        if (nodeData.inputs?.messageIdReaction) {
                            defaultParams[action].messageId = nodeData.inputs.messageIdReaction
                        }
                        break

                    case 'getAllMessages':
                        // getAllMessages might use similar params to listMessages
                        if (nodeData.inputs?.chatChannelIdListMessages) {
                            defaultParams[action].chatChannelId = nodeData.inputs.chatChannelIdListMessages
                        }
                        if (nodeData.inputs?.teamIdListMessages) {
                            defaultParams[action].teamId = nodeData.inputs.teamIdListMessages
                        }
                        break
                }
            })
        }

        const teamsTools = createTeamsTools({
            accessToken,
            actions,
            defaultParams,
            type: teamsType
        })

        return teamsTools
    }
}

module.exports = { nodeClass: MicrosoftTeams_Tools }
