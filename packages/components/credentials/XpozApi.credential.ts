import { INodeParams, INodeCredential } from '../src/Interface'

class XpozApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Xpoz API'
        this.name = 'xpozApi'
        this.version = 1.0
        this.description =
            'Get a free access key (no credit card) at <a target="_blank" href="https://xpoz.ai/get-token">xpoz.ai/get-token</a>'
        this.inputs = [
            {
                label: 'Access Key',
                name: 'xpozApiKey',
                type: 'password',
                placeholder: '<XPOZ_ACCESS_KEY>'
            }
        ]
    }
}

module.exports = { credClass: XpozApi }
