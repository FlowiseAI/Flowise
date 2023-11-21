import { INodeParams, INodeCredential } from '../src/Interface'

class ElasticSearchUserPassword implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'ElasticSearch User Password'
        this.name = 'elasticSearchUserPassword'
        this.version = 1.0
        this.description = `Use Cloud ID field to enter your Elastic Cloud ID or the URL of the Elastic server instance.
        Refer to <a target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/setting-up-authentication.html">official guide</a> on how to get User Password from ElasticSearch.`
        this.inputs = [
            {
                label: 'Cloud ID',
                name: 'cloudId',
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

module.exports = { credClass: ElasticSearchUserPassword }
