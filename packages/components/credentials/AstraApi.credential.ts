import { INodeParams, INodeCredential } from '../src/Interface'

class AstraApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Astra API'
        this.name = 'AstraApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Colection Name',
                name: 'collectionName',
                type: 'string'
            },
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

module.exports = { credClass: AstraApi }
