import { INodeParams, INodeCredential } from '../src/Interface'

class IBMWatsonxCredential implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'IBM Watsonx'
        this.name = 'ibmWatsonx'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Version',
                name: 'version',
                type: 'string',
                placeholder: 'YYYY-MM-DD'
            },
            {
                label: 'Service URL',
                name: 'serviceUrl',
                type: 'string',
                placeholder: '<SERVICE_URL>'
            },
            {
                label: 'Project ID',
                name: 'projectId',
                type: 'string',
                placeholder: '<PROJECT_ID>'
            },
            {
                label: 'Watsonx AI Auth Type',
                name: 'watsonxAIAuthType',
                type: 'options',
                options: [
                    {
                        label: 'IAM',
                        name: 'iam'
                    },
                    {
                        label: 'Bearer Token',
                        name: 'bearertoken'
                    }
                ],
                default: 'iam'
            },
            {
                label: 'Watsonx AI IAM API Key',
                name: 'watsonxAIApikey',
                type: 'password',
                description: 'API Key for Watsonx AI when using IAM',
                placeholder: '<YOUR-APIKEY>',
                optional: true
            },
            {
                label: 'Watsonx AI Bearer Token',
                name: 'watsonxAIBearerToken',
                type: 'password',
                description: 'Bearer Token for Watsonx AI when using Bearer Token',
                placeholder: '<YOUR-BEARER-TOKEN>',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: IBMWatsonxCredential }
