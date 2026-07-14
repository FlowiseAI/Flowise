import { INodeCredential, INodeParams } from '../src/Interface'

class DaoXEApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'DaoXE API'
        this.name = 'daoxeApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'DaoXE API Key',
                name: 'daoxeApiKey',
                type: 'password',
                description: 'API key from the DaoXE dashboard (https://daoxe.com/dashboard)'
            }
        ]
    }
}

module.exports = { credClass: DaoXEApi }
