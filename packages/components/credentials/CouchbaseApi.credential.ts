/*
* Temporary disabled due to the incompatibility with the docker node-alpine:
* https://github.com/FlowiseAI/Flowise/pull/2303

import { INodeParams, INodeCredential } from '../src/Interface'

class CouchbaseApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Couchbase API'
        this.name = 'couchbaseApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Couchbase Connection String',
                name: 'connectionString',
                type: 'string'
            },
            {
                label: 'Couchbase Username',
                name: 'username',
                type: 'string'
            },
            {
                label: 'Couchbase Password',
                name: 'password',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: CouchbaseApi }
*/
