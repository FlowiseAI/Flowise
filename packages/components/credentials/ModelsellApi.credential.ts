import { INodeCredential, INodeParams } from '../src/Interface'

class ModelsellApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Modelsell API'
        this.name = 'modelsellApi'
        this.version = 1.0
        this.description = 'Get your API key from <a target="_blank" href="https://modelsell.com/console/token">Modelsell</a>'
        this.inputs = [
            {
                label: 'Modelsell API Key',
                name: 'modelsellApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ModelsellApi }
