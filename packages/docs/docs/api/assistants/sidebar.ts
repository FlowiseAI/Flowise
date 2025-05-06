import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/assistants/assistants-api'
        },
        {
            type: 'category',
            label: 'assistants',
            items: [
                {
                    type: 'doc',
                    id: 'api/assistants/create-assistant',
                    label: 'Create a new assistant',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/assistants/list-assistants',
                    label: 'List all assistants',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/assistants/get-assistant-by-id',
                    label: 'Get assistant by ID',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/assistants/update-assistant',
                    label: 'Update assistant details',
                    className: 'api-method put'
                },
                {
                    type: 'doc',
                    id: 'api/assistants/delete-assistant',
                    label: 'Delete an assistant',
                    className: 'api-method delete'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
