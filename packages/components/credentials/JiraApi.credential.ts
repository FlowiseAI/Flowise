import { INodeParams, INodeCredential } from '../src/Interface'

class JiraApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Jira API'
        this.name = 'JiraApi'
        this.version = 1.0
        this.description =
            'Create an API token by going to <a target="_blank" href="https://id.atlassian.com/manage-profile/security/api-tokens">Atlassian API token management page</a>'
        this.inputs = [
            {
                label: 'Jira API Key',
                name: 'accessToken',
                type: 'password'
            },
            {
                label: 'Jira API Email',
                name: 'username',
                type: 'string'
            },
            {
                label: 'Jira URL',
                name: 'host',
                type: 'string'
            }
        ]
    }
}

module.exports = { credClass: JiraApi }
