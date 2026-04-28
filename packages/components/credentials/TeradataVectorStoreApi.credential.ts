import { INodeParams, INodeCredential } from '../src/Interface'

class TeradataVectorStoreApiCredentials implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Teradata Vector Store API Credentials'
        this.name = 'teradataVectorStoreApiCredentials'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Teradata Host IP',
                name: 'tdHostIp',
                type: 'string'
            },
            {
                label: 'Username',
                name: 'tdUsername',
                type: 'string'
            },
            {
                label: 'Password',
                name: 'tdPassword',
                type: 'password'
            },
            {
                label: 'Vector_Store_Base_URL',
                name: 'baseURL',
                description: 'Teradata Vector Store Base URL',
                placeholder: `Base_URL`,
                type: 'string'
            },
            {
                label: 'JWT Token',
                name: 'jwtToken',
                type: 'password',
                description: 'Bearer token for JWT authentication',
                optional: true
            }
        ]
    }
}

module.exports = { credClass: TeradataVectorStoreApiCredentials }
