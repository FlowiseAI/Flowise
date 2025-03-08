import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/hello-world/hello-world-api'
        },
        {
            type: 'category',
            label: 'greeting',
            link: {
                type: 'doc',
                id: 'api/hello-world/greeting'
            },
            items: [
                {
                    type: 'doc',
                    id: 'api/hello-world/get-hello',
                    label: 'Get a greeting',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/hello-world/get-personalized-hello',
                    label: 'Get a personalized greeting',
                    className: 'api-method get'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
