import { INodeCredential, INodeParams } from '../src/Interface'

class AGIoneApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'AGIone API'
        this.name = 'agioneApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'AGIone Auth Token',
                name: 'agioneApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: AGIoneApi }
