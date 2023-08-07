import { INodeParams, INodeCredential } from '../src/Interface'

class AirtableApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Airtable API'
        this.name = 'airtableApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://support.airtable.com/docs/creating-and-using-api-keys-and-access-tokens">official guide</a> on how to get accessToken on Airtable'
        this.inputs = [
            {
                label: 'Access Token',
                name: 'accessToken',
                type: 'password',
                placeholder: '<AIRTABLE_ACCESS_TOKEN>'
            }
        ]
    }
}

module.exports = { credClass: AirtableApi }
