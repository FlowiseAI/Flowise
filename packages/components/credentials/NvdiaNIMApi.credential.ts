import { INodeCredential, INodeParams } from '../src/Interface'

class NvidiaNIMApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'NVIDIA NGC API Key'
        this.name = 'nvidiaNIMApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'NVIDIA NGC API Key',
                name: 'nvidiaNIMApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: NvidiaNIMApi }
