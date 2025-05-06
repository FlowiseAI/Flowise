import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/variables/variables-api'
        },
        {
            type: 'category',
            label: 'variables',
            items: [
                {
                    type: 'doc',
                    id: 'api/variables/create-variable',
                    label: 'Create a new variable',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/variables/get-all-variables',
                    label: 'List all variables',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/variables/update-variable',
                    label: 'Update a variable by ID',
                    className: 'api-method put'
                },
                {
                    type: 'doc',
                    id: 'api/variables/delete-variable',
                    label: 'Delete a variable by ID',
                    className: 'api-method delete'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
