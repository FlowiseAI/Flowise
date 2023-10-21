import { INodeParams, INodeCredential } from '../src/Interface'

class ElectricsearchAPI implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Elasticsearch API'
        this.name = 'elasticsearchApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://www.elastic.co/guide/en/kibana/current/api-keys.html">official guide</a> on how to get an API Key from ElasticSearch'
        this.inputs = [
            {
                label: 'Elasticsearch Endpoint',
                name: 'endpoint',
                type: 'string'
            },
            {
                label: 'Elasticsearch API Key',
                name: 'apiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ElectricsearchAPI }
