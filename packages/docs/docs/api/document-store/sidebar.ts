import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebar: SidebarsConfig = {
    apisidebar: [
        {
            type: 'doc',
            id: 'api/document-store/document-store-api'
        },
        {
            type: 'category',
            label: 'document-store',
            items: [
                {
                    type: 'doc',
                    id: 'api/document-store/create-document-store',
                    label: 'Create a new document store',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/get-all-document-stores',
                    label: 'List all document stores',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/get-all-document-stores',
                    label: 'List all document stores',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/get-document-store-by-id',
                    label: 'Get a specific document store',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/update-document-store',
                    label: 'Update a specific document store',
                    className: 'api-method put'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/delete-document-store',
                    label: 'Delete a specific document store',
                    className: 'api-method delete'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/preview-chunking',
                    label: 'Preview document chunks',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/process-chunking',
                    label: 'Process loading & chunking operation',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/get-file-chunks',
                    label: 'Get file chunks',
                    className: 'api-method get'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/update-file-chunk',
                    label: 'Update a file chunk',
                    className: 'api-method put'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/delete-file-chunk',
                    label: 'Delete a file chunk',
                    className: 'api-method delete'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/query-vector-store',
                    label: 'Query vector store',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/delete-vector-store-data',
                    label: 'Delete vector store data',
                    className: 'api-method delete'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/upsert-document',
                    label: 'Upsert document to document store',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/refresh-document',
                    label: 'Re-process and upsert all documents in document store',
                    className: 'api-method post'
                },
                {
                    type: 'doc',
                    id: 'api/document-store/delete-loader-from-document-store',
                    label: 'Delete specific document loader and associated chunks from document store',
                    className: 'api-method delete'
                }
            ]
        }
    ]
}

export default sidebar.apisidebar
