import { INodeParams, INodeCredential } from '../src/Interface'

class PlivoApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Plivo API'
        this.name = 'plivoApi'
        this.version = 1.0
        this.description =
            'Find your Auth ID and Auth Token on the <a target="_blank" href="https://cx.plivo.com/">Plivo console</a> dashboard.'
        this.inputs = [
            {
                label: 'Auth ID',
                name: 'authId',
                type: 'string',
                placeholder: '<PLIVO_AUTH_ID>'
            },
            {
                label: 'Auth Token',
                name: 'authToken',
                type: 'password',
                placeholder: '<PLIVO_AUTH_TOKEN>'
            }
        ]
    }
}

module.exports = { credClass: PlivoApi }
