import { INodeParams, INodeCredential } from '../src/Interface'

class SeltzApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Seltz API'
        this.name = 'seltzApi'
        this.version = 1.0
        this.description =
            'You can get your API key from the <a target="_blank" href="https://console.seltz.ai">Seltz Console</a>. Refer to <a target="_blank" href="https://docs.seltz.ai">official docs</a> for more information.'
        this.inputs = [
            {
                label: 'Seltz API Key',
                name: 'seltzApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: SeltzApi }
