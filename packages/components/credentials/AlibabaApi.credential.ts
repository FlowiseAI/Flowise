import { INodeParams, INodeCredential } from '../src/Interface'

class AlibabaApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Alibaba API'
        this.name = 'AlibabaApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Alibaba Api Key',
                name: 'alibabaApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: AlibabaApi }
