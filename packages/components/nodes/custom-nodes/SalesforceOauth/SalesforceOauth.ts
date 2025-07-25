import { INode, INodeParams } from '../../../src/Interface'

class SalesforceOauth_Custom_Nodes implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Salesforce OAuth'
        this.name = 'salesforceOauth'
        this.version = 1.0
        this.type = 'SalesforceOauth'
        this.icon = 'salesforce.png'
        this.category = 'Custom Nodes'
        this.description = 'Authenticate with Salesforce OAuth'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Salesforce OAuth Settings',
            name: 'credential',
            type: 'credential',
            credentialNames: ['salesforceOAuth']
        }
        this.inputs = [
            {
                label: 'Refresh Token',
                name: 'refreshToken',
                type: 'string',
                optional: false,
                disabled: true
            }
        ]
    }
}

module.exports = { nodeClass: SalesforceOauth_Custom_Nodes }
