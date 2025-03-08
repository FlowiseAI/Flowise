import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/ping/ping-api'
        },
        {
            type: 'category',
            label: 'ping',
            link: {
                type: 'doc',
                id: 'api/ping/ping'
            },
            items: [
                {
                    type: 'doc',
                    id: 'api/ping/ping-server',
                    label: 'Ping the server',
                    className: 'api-method get'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
