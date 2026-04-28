import { INodeParams, INodeCredential } from '../src/Interface'

class ConfluenceServerDCApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Confluence Server/Data Center API'
        this.name = 'confluenceServerDCApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html/">official guide</a> on how to get Personal Access Token</a> on Confluence'
        this.inputs = [
            {
                label: 'Personal Access Token',
                name: 'personalAccessToken',
                type: 'password',
                placeholder: '<CONFLUENCE_PERSONAL_ACCESS_TOKEN>'
            }
        ]
    }
}

module.exports = { credClass: ConfluenceServerDCApi }
