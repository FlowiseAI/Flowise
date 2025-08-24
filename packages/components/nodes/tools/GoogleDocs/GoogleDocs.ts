import { convertMultiOptionsToStringArray, getCredentialData, getCredentialParam, refreshOAuth2Token } from '../../../src/utils'
import { createGoogleDocsTools } from './core'
import type { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'

class GoogleDocs_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google Docs'
        this.name = 'googleDocsTool'
        this.version = 1.0
        this.type = 'GoogleDocs'
        this.icon = 'google-docs.svg'
        this.category = 'Tools'
        this.description =
            'Perform Google Docs operations such as creating, reading, updating, and deleting documents, as well as text manipulation'
        this.baseClasses = ['Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['googleDocsOAuth2']
        }
        this.inputs = [
            // Document Actions
            {
                label: 'Actions',
                name: 'actions',
                type: 'multiOptions',
                description: 'Actions to perform',
                options: [
                    {
                        label: 'Create Document',
                        name: 'createDocument'
                    },
                    {
                        label: 'Get Document',
                        name: 'getDocument'
                    },
                    {
                        label: 'Update Document',
                        name: 'updateDocument'
                    },
                    {
                        label: 'Insert Text',
                        name: 'insertText'
                    },
                    {
                        label: 'Replace Text',
                        name: 'replaceText'
                    },
                    {
                        label: 'Append Text',
                        name: 'appendText'
                    },
                    {
                        label: 'Get Text Content',
                        name: 'getTextContent'
                    },
                    {
                        label: 'Insert Image',
                        name: 'insertImage'
                    },
                    {
                        label: 'Create Table',
                        name: 'createTable'
                    }
                ]
            },
            // Document Parameters
            {
                label: 'Document ID',
                name: 'documentId',
                type: 'string',
                description: 'Document ID for operations on specific documents',
                show: {
                    actions: [
                        'getDocument',
                        'updateDocument',
                        'insertText',
                        'replaceText',
                        'appendText',
                        'getTextContent',
                        'insertImage',
                        'createTable'
                    ]
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Title',
                name: 'title',
                type: 'string',
                description: 'Document title',
                show: {
                    actions: ['createDocument']
                },
                additionalParams: true,
                optional: true
            },
            // Text Parameters
            {
                label: 'Text',
                name: 'text',
                type: 'string',
                description: 'Text content to insert or append',
                show: {
                    actions: ['createDocument', 'updateDocument', 'insertText', 'appendText']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Index',
                name: 'index',
                type: 'number',
                description: 'Index where to insert text or media (1-based, default: 1 for beginning)',
                default: 1,
                show: {
                    actions: ['createDocument', 'updateDocument', 'insertText', 'insertImage', 'createTable']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Replace Text',
                name: 'replaceText',
                type: 'string',
                description: 'Text to replace',
                show: {
                    actions: ['updateDocument', 'replaceText']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'New Text',
                name: 'newText',
                type: 'string',
                description: 'New text to replace with',
                show: {
                    actions: ['updateDocument', 'replaceText']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Match Case',
                name: 'matchCase',
                type: 'boolean',
                description: 'Whether the search should be case-sensitive',
                default: false,
                show: {
                    actions: ['updateDocument', 'replaceText']
                },
                additionalParams: true,
                optional: true
            },

            // Media Parameters
            {
                label: 'Image URL',
                name: 'imageUrl',
                type: 'string',
                description: 'URL of the image to insert',
                show: {
                    actions: ['createDocument', 'updateDocument', 'insertImage']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Table Rows',
                name: 'rows',
                type: 'number',
                description: 'Number of rows in the table',
                show: {
                    actions: ['createDocument', 'updateDocument', 'createTable']
                },
                additionalParams: true,
                optional: true
            },
            {
                label: 'Table Columns',
                name: 'columns',
                type: 'number',
                description: 'Number of columns in the table',
                show: {
                    actions: ['createDocument', 'updateDocument', 'createTable']
                },
                additionalParams: true,
                optional: true
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        let credentialData = await getCredentialData(nodeData.credential ?? '', options)
        credentialData = await refreshOAuth2Token(nodeData.credential ?? '', credentialData, options)
        const accessToken = getCredentialParam('access_token', credentialData, nodeData)

        if (!accessToken) {
            throw new Error('No access token found in credential')
        }

        // Get all actions
        const actions = convertMultiOptionsToStringArray(nodeData.inputs?.actions)

        const defaultParams = this.transformNodeInputsToToolArgs(nodeData)

        const tools = createGoogleDocsTools({
            accessToken,
            actions,
            defaultParams
        })

        return tools
    }

    transformNodeInputsToToolArgs(nodeData: INodeData): Record<string, any> {
        const nodeInputs: Record<string, any> = {}

        // Document parameters
        if (nodeData.inputs?.documentId) nodeInputs.documentId = nodeData.inputs.documentId
        if (nodeData.inputs?.title) nodeInputs.title = nodeData.inputs.title

        // Text parameters
        if (nodeData.inputs?.text) nodeInputs.text = nodeData.inputs.text
        if (nodeData.inputs?.index) nodeInputs.index = nodeData.inputs.index
        if (nodeData.inputs?.replaceText) nodeInputs.replaceText = nodeData.inputs.replaceText
        if (nodeData.inputs?.newText) nodeInputs.newText = nodeData.inputs.newText
        if (nodeData.inputs?.matchCase !== undefined) nodeInputs.matchCase = nodeData.inputs.matchCase

        // Media parameters
        if (nodeData.inputs?.imageUrl) nodeInputs.imageUrl = nodeData.inputs.imageUrl
        if (nodeData.inputs?.rows) nodeInputs.rows = nodeData.inputs.rows
        if (nodeData.inputs?.columns) nodeInputs.columns = nodeData.inputs.columns

        return nodeInputs
    }
}

module.exports = { nodeClass: GoogleDocs_Tools }
