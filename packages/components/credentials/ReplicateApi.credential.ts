import { INodeParams, INodeCredential } from '../src/Interface'

class ReplicateApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Replicate API'
        this.name = 'replicateApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Replicate Api Key',
                name: 'replicateApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ReplicateApi }
