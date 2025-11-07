import { INodeParams, INodeCredential } from '../src/Interface'

class ZendeskApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Zendesk API'
        this.name = 'zendeskApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://support.zendesk.com/hc/en-us/articles/4408843597850-Generating-a-new-API-token">official guide</a> on how to get API token from Zendesk'
        this.inputs = [
            {
                label: 'User Name',
                name: 'user',
                type: 'string',
                placeholder: 'user@example.com'
            },
            {
                label: 'API Token',
                name: 'token',
                type: 'password',
                placeholder: '<ZENDESK_API_TOKEN>'
            }
        ]
    }
}

module.exports = { credClass: ZendeskApi }

