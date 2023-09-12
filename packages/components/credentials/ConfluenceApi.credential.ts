import { INodeParams, INodeCredential } from '../src/Interface'

class ConfluenceApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Confluence API'
        this.name = 'confluenceApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://support.atlassian.com/confluence-cloud/docs/manage-oauth-access-tokens/">official guide</a> on how to get Access Token or <a target="_blank" href="https://id.atlassian.com/manage-profile/security/api-tokens">API Token</a> on Confluence'
        this.inputs = [
            {
                label: 'Access Token',
                name: 'accessToken',
                type: 'password',
                placeholder: '<CONFLUENCE_ACCESS_TOKEN>'
            },
            {
                label: 'Username',
                name: 'username',
                type: 'string',
                placeholder: '<CONFLUENCE_USERNAME>'
            }
        ]
    }
}

module.exports = { credClass: ConfluenceApi }
