import { INodeParams, INodeCredential } from '../src/Interface'

class JiraApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Jira API'
        this.name = 'jiraApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/">official guide</a> on how to get accessToken on Github'
        this.inputs = [
            {
                label: 'User Name',
                name: 'username',
                type: 'string',
                placeholder: 'username@example.com'
            },
            {
                label: 'Access Token',
                name: 'accessToken',
                type: 'password',
                placeholder: '<JIRA_ACCESS_TOKEN>'
            }
        ]
    }
}

module.exports = { credClass: JiraApi }
