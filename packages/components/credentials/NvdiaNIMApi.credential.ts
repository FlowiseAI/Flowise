import { INodeParams, INodeCredential } from '../src/Interface'

class NvidiaNIMApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Nvdia NIM API Key'
        this.name = 'nvidiaNIMApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Nvidia NIM API Key',
                name: 'nvidiaNIMApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: NvidiaNIMApi }
