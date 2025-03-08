import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/document-store/document-store-api'
        },
        {
            type: 'category',
            label: 'documents',
            link: {
                type: 'doc',
                id: 'api/document-store/documents'
            },
            items: [
                {
                    type: 'doc',
                    id: 'api/document-store/create-document',
                    label: 'Create a new document',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/list-documents',
                    label: 'List all documents',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/get-document-by-id',
                    label: 'Get document by ID',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/update-document',
                    label: 'Update document details',
                    className: 'api-method put'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/delete-document',
                    label: 'Delete a document',
                    className: 'api-method delete'
                }
            ]
        },
        {
            type: 'category',
            label: 'collections',
            link: {
                type: 'doc',
                id: 'api/document-store/collections'
            },
            items: [
                {
                    type: 'doc',
                    id: 'api/document-store/create-collection',
                    label: 'Create a new collection',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/list-collections',
                    label: 'List all collections',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/get-collection-by-id',
                    label: 'Get collection by ID',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/update-collection',
                    label: 'Update collection details',
                    className: 'api-method put'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/delete-collection',
                    label: 'Delete a collection',
                    className: 'api-method delete'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
