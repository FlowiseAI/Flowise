import { INodeCredential, INodeParams } from '../src/Interface'

class KCenterApiCredentials implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'KCenter API'
        this.name = 'kcenterApi'
        this.version = 1.0
        this.description = 'Refer to <a target="_blank" href="https://www.usu.com/">official guide</a> on how to get accessToken on KCenter'
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                placeholder: 'http://localhost'
            },
            {
                label: 'Mandator',
                name: 'mandator',
                type: 'string',
                placeholder: '<mandator>',
                optional: true
            },
            {
                label: 'User',
                name: 'user',
                type: 'string',
                placeholder: '<user>',
                optional: true
            },
            {
                label: 'Provider Id',
                name: 'providerId',
                type: 'string',
                placeholder: '<App/Provider Id>',
                optional: true,
                default: 'jwt-eternal'
            },
            {
                label: 'Api / Private Key',
                name: 'accessToken',
                type: 'password',
                placeholder: '<api key /provider private key>'
            }
        ]
    }
}

module.exports = { credClass: KCenterApiCredentials }
