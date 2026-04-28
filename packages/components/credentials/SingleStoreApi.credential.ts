import { INodeParams, INodeCredential } from '../src/Interface'

class SingleStoreApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'SingleStore API'
        this.name = 'singleStoreApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'User',
                name: 'user',
                type: 'string',
                placeholder: '<SINGLESTORE_USERNAME>'
            },
            {
                label: 'Password',
                name: 'password',
                type: 'password',
                placeholder: '<SINGLESTORE_PASSWORD>'
            }
        ]
    }
}

module.exports = { credClass: SingleStoreApi }
