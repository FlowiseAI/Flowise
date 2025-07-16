import { INodeParams, INodeCredential } from '../src/Interface'

class SalesforceOauth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Salesforce OAuth'
        this.name = 'salesforceOAuth'
        this.version = 1.0
        this.description = 'Salesforce OAuth Credentials'
        this.inputs = [
            {
                label: 'Refresh Token',
                name: 'refreshToken',
                type: 'password',
                optional: false,
                disabled: true,
                placeholder: 'Will be populated after OAuth authentication'
            }
        ]
    }
}

module.exports = { credClass: SalesforceOauth }
