import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/leads/leads-api'
        },
        {
            type: 'category',
            label: 'leads',
            link: {
                type: 'doc',
                id: 'api/leads/leads'
            },
            items: [
                {
                    type: 'doc',
                    id: 'api/leads/create-lead',
                    label: 'Create a new lead',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/leads/list-leads',
                    label: 'List all leads',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/leads/get-lead-by-id',
                    label: 'Get lead by ID',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/leads/update-lead',
                    label: 'Update lead details',
                    className: 'api-method put'
                },
                {
                    type: 'doc',
                    id: 'api/leads/delete-lead',
                    label: 'Delete a lead',
                    className: 'api-method delete'
                },
                {
                    type: 'doc',
                    id: 'api/leads/add-lead-note',
                    label: 'Add a note to a lead',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/leads/get-lead-notes',
                    label: 'Get lead notes',
                    className: 'api-method get'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
