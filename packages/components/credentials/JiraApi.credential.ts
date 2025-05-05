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
            'Refer to <a target="_blank" href="https://github.com/modelcontextprotocol/servers/tree/main/src/jira">official guide</a> on how to get botToken and teamId on Jira'
        this.inputs = [
            {
                label: 'Jira API Key',
                name: 'jiraApiKey',
                type: 'password'
            },
            {
                label: 'Jira API Email',
                name: 'jiraApiEmail',
                type: 'string'
            },
            {
                label: 'Jira URL',
                name: 'jiraUrl',
                type: 'string'
            }
        ]
    }
}

module.exports = { credClass: JiraApi }
