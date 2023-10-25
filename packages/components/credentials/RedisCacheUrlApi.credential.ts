import { INodeParams, INodeCredential } from '../src/Interface'

class RedisCacheUrlApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Redis Cache URL'
        this.name = 'redisCacheUrlApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Redis URL',
                name: 'redisUrl',
                type: 'string',
                default: '127.0.0.1'
            }
        ]
    }
}

module.exports = { credClass: RedisCacheUrlApi }
