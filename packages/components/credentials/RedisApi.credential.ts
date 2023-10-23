import { INodeParams, INodeCredential } from '../src/Interface'

class RedisApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Redis API'
        this.name = 'redisApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Redis Host',
                name: 'redisHost',
                type: 'string',
                default: '127.0.0.1'
            },
            {
                label: 'Port',
                name: 'redisPort',
                type: 'number',
                default: '6789'
            },
            {
                label: 'User',
                name: 'redisUser',
                type: 'string',
                placeholder: '<REDIS_USERNAME>'
            },
            {
                label: 'Password',
                name: 'redisPwd',
                type: 'password',
                placeholder: '<REDIS_PASSWORD>'
            }
        ]
    }
}

module.exports = { credClass: RedisApi }
