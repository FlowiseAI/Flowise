import { INodeParams, INodeCredential } from '../src/Interface'

class ElasticSearchApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'ElasticSearch API'
        this.name = 'elasticSearchApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html">official guide</a> on how to get API from ElasticSearch'
        this.inputs = [
            {
                label: 'ElasticSearch Api Key',
                name: 'elasticSearchApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: ElasticSearchApi }
