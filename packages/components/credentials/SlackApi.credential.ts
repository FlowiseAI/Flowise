import { INodeParams, INodeCredential } from '../src/Interface'

class SlackApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Slack API'
        this.name = 'slackApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://github.com/modelcontextprotocol/servers/tree/main/src/slack">official guide</a> on how to get botToken and teamId on Slack'
        this.inputs = [
            {
                label: 'Bot Token',
                name: 'botToken',
                type: 'password'
            },
            {
                label: 'Team ID',
                name: 'teamId',
                type: 'string',
                placeholder: '<SLACK_TEAM_ID>'
            }
        ]
    }
}

module.exports = { credClass: SlackApi }
