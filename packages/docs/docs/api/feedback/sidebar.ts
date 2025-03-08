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
            link: {
                type: 'doc',
                id: 'api/feedback/feedback'
            },
            items: [
                {
                    type: 'doc',
                    id: 'api/feedback/submit-feedback',
                    label: 'Submit feedback',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/feedback/get-feedback',
                    label: 'Get feedback by ID',
                    className: 'api-method get'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
