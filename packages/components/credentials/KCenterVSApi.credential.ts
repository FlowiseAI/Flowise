import { INodeCredential, INodeParams } from '../src/Interface'

class KCenterVSApiCredentials implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'KCenter VS API'
        this.name = 'kcenterVsApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://www.usu.com/">official guide</a> on how to get accessToken on KCenter VS'
        this.inputs = [
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                placeholder: 'http://localhost'
            },
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'string',
                placeholder: '<api key>'
            }
        ]
    }
}

module.exports = { credClass: KCenterVSApiCredentials }
