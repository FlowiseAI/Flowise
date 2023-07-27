import { INodeParams, INodeCredential } from '../src/Interface'

class ReplicateApi implements INodeCredential {
    label: string
    name: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Replicate API'
        this.name = 'replicateApi'
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
