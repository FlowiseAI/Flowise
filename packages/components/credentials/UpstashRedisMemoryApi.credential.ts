import { INodeParams, INodeCredential } from '../src/Interface'

class UpstashRedisMemoryApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Upstash Redis Memory API'
        this.name = 'upstashRedisMemoryApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://upstash.com/docs/redis/overall/getstarted">official guide</a> on how to create redis instance and get redis REST Token'
        this.inputs = [
            {
                label: 'Upstash Redis REST Token',
                name: 'upstashRestToken',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: UpstashRedisMemoryApi }
