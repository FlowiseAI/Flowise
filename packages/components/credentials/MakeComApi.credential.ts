import { INodeParams, INodeCredential } from '../src/Interface'

class MakeComApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Make.Com API'
        this.name = 'makeComApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Make.com API Endpoint Url',
                name: 'apiUrl',
                type: 'string',
                description:
                    'Your Make.com API endpoint URL (e.g., This is the full domain in the URL once you logon.   Ex: "https://us1.make.com"'
            },
            {
                label: 'Make.com Api Key',
                name: 'apiKey',
                type: 'password',
                description: 'Your Make.com API key. Can be found under your profile -> API Access'
            },

            {
                label: 'Team ID',
                name: 'teamId',
                type: 'string',
                description:
                    'Your Make.com Team ID. Can be found under the "Team" tab on the left sidebar in the URL Ex: https://us1.make.com/xxxxx/team/dashboard'
            },
            {
                label: 'Organization ID',
                name: 'organizationId',
                type: 'string',
                description:
                    'Your Make.com Organization ID. Can be found under the "Organization Settings" in the URL Ex: https://us1.make.com/organization/xxxxx/dashboard'
            }
        ]
    }
}

module.exports = { credClass: MakeComApi }
