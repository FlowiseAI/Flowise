import { INodeParams, INodeCredential } from '../src/Interface'

class UpstashRedisApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Upstash Redis API'
        this.name = 'upstashRedisApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Upstash Redis REST URL',
                name: 'upstashConnectionUrl',
                type: 'string'
            },
            {
                label: 'Token',
                name: 'upstashConnectionToken',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: UpstashRedisApi }
