import { INodeParams, INodeCredential } from '../src/Interface'

class AstraDBApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Astra DB API'
        this.name = 'AstraDBApi'
        this.version = 2.0
        this.inputs = [
            {
                label: 'Astra DB Application Token',
                name: 'applicationToken',
                type: 'password'
            },
            {
                label: 'Astra DB Api Endpoint',
                name: 'dbEndPoint',
                type: 'string'
            }
        ]
    }
}

module.exports = { credClass: AstraDBApi }
