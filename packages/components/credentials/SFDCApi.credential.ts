import { INodeParams, INodeCredential } from '../src/Interface'

class SFDCApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Salesforce API'
        this.name = 'salesforceApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://developer.salesforce.com/docs/atlas.en-us.api_analytics.meta/api_analytics/sforce_analytics_rest_api_get_started.htm">official guide</a> on how to get your Salesforce API key'
        this.inputs = [
            {
                label: 'Salesforce Client ID',
                name: 'salesforceClientId',
                type: 'password',
                placeholder: '<SALESFORCE_CLIENT_ID>'
            },
            {
                label: 'Salesforce Client Secret',
                name: 'salesforceClientSecret',
                type: 'password',
                placeholder: '<SALESFORCE_CLIENT_SECRET>'
            },
            {
                label: 'Salesforce Instance',
                name: 'salesforceInstance',
                type: 'string',
                placeholder: 'https://na1.salesforce.com'
            }
        ]
    }
}

module.exports = { credClass: SFDCApi }
