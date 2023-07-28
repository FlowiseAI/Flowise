import { INodeParams, INodeCredential } from '../src/Interface'

class DynamodbMemoryApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'DynamodbMemory API'
        this.name = 'dynamodbMemoryApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Access Key',
                name: 'accessKey',
                type: 'password'
            },
            {
                label: 'Secret Access Key',
                name: 'secretAccessKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: DynamodbMemoryApi }
