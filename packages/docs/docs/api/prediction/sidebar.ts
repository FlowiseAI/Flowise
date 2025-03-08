import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/prediction/prediction-api'
        },
        {
            type: 'category',
            label: 'prediction',
            link: {
                type: 'doc',
                id: 'api/prediction/prediction'
            },
            items: [
                {
                    type: 'doc',
                    id: 'api/prediction/create-prediction',
                    label: 'Create a new prediction',
                    className: 'api-method post'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
