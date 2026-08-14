import { INodeParams, INodeCredential } from '../src/Interface'

class ModelsLabApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'ModelsLab API'
        this.name = 'modelsLabApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'ModelsLab API Key',
                name: 'modelsLabApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ModelsLabApi }
