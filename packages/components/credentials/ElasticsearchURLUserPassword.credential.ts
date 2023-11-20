import { INodeParams, INodeCredential } from '../src/Interface'

class ElasticSearchURLUserPassword implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'ElasticSearch Custom URL User Password'
        this.name = 'elasticSearchURLUserPassword'
        this.version = 1.0
        this.description =
            'Allow to connect to a custom Elastic index'
        this.inputs = [
            {
                label: 'Custom URL',
                name: 'customURL',
                type: 'string'
            },
            {
                label: 'ElasticSearch User',
                name: 'username',
                type: 'string'
            },
            {
                label: 'ElasticSearch Password',
                name: 'password',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ElasticSearchURLUserPassword }
