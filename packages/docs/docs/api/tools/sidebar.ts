import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/tools/tools-api'
        },
        {
            type: 'category',
            label: 'tools',
            link: {
                type: 'doc',
                id: 'api/tools/tools'
            },
            items: [
                {
                    type: 'doc',
                    id: 'api/tools/create-tool',
                    label: 'Create a new tool',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/tools/get-all-tools',
                    label: 'List all tools',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/tools/get-tool-by-id',
                    label: 'Get a tool by ID',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/tools/update-tool',
                    label: 'Update a tool by ID',
                    className: 'api-method put'
                },
                {
                    type: 'doc',
                    id: 'api/tools/delete-tool',
                    label: 'Delete a tool by ID',
                    className: 'api-method delete'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
