import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/feedback/feedback-api'
        },
        {
            type: 'category',
            label: 'feedback',
            items: [
                {
                    type: 'doc',
                    id: 'api/feedback/create-chat-message-feedback-for-chatflow',
                    label: 'Create new chat message feedback',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/feedback/get-all-chat-message-feedback',
                    label: 'List all chat message feedbacks for a chatflow',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/feedback/update-chat-message-feedback-for-chatflow',
                    label: 'Update chat message feedback',
                    className: 'api-method put'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
