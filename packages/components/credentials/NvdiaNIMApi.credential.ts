import { INodeParams, INodeCredential } from '../src/Interface'

class NvdiaNIMApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Nvdia NIM API Key'
        this.name = 'nvdiaNIMApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Nvdia NIM API Key',
                name: 'nvdiaNIMApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: NvdiaNIMApi }
