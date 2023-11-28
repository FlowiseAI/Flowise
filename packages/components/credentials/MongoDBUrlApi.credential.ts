import { INodeParams, INodeCredential } from '../src/Interface'

class MongoDBUrlApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'MongoDB ATLAS'
        this.name = 'mongoDBUrlApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'ATLAS Connection URL',
                name: 'mongoDBConnectUrl',
                type: 'string',
                placeholder: 'mongodb+srv://<user>:<pwd>@cluster0.example.mongodb.net/?retryWrites=true&w=majority'
            }
        ]
    }
}

module.exports = { credClass: MongoDBUrlApi }
