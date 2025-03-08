import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/chat-message/chat-message-api'
        },
        {
            type: 'category',
            label: 'chat-messages',
            link: {
                type: 'doc',
                id: 'api/chat-message/chat-messages'
            },
            items: [
                {
                    type: 'doc',
                    id: 'api/chat-message/create-chat-message',
                    label: 'Create a new chat message',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/chat-message/list-chat-messages',
                    label: 'List chat messages',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/chat-message/get-chat-message-by-id',
                    label: 'Get chat message by ID',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/chat-message/update-chat-message',
                    label: 'Update a chat message',
                    className: 'api-method put'
                },
                {
                    type: 'doc',
                    id: 'api/chat-message/delete-chat-message',
                    label: 'Delete a chat message',
                    className: 'api-method delete'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
