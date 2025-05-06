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
            items: [
                {
                    type: 'doc',
                    id: 'api/leads/create-lead',
                    label: 'Create a new lead in a chatflow',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/leads/get-all-leads-for-chatflow',
                    label: 'Get all leads for a specific chatflow',
                    className: 'api-method get'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
