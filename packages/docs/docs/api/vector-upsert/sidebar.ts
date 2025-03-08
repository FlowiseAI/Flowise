import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/vector-upsert/vector-upsert-api'
        },
        {
            type: 'category',
            label: 'vector',
            link: {
                type: 'doc',
                id: 'api/vector-upsert/vector'
            },
            items: [
                {
                    type: 'doc',
                    id: 'api/vector-upsert/vector-upsert',
                    label: 'Upsert vector embeddings',
                    className: 'api-method post'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
