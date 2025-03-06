import { INodeParams, INodeCredential } from '../src/Interface'

class StripeApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Stripe API'
        this.name = 'stripeApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://support.airtable.com/docs/creating-and-using-api-keys-and-access-tokens">official guide</a> on how to get accessToken on Airtable'
        this.inputs = [
            {
                label: 'Stripe API Token',
                name: 'stripeApiToken',
                type: 'password',
                placeholder: '<STRIPE_API_TOKEN>'
            }
        ]
    }
}

module.exports = { credClass: StripeApi }
