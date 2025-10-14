import { INodeParams, INodeCredential } from '../src/Interface'

class TeradataBearerTokenCredential implements INodeCredential {
    label: string
    name: string
    description: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Teradata Bearer Token'
        this.name = 'teradataBearerToken'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://docs.teradata.com/r/Enterprise_IntelliFlex_VMware/Teradata-Vector-Store-User-Guide/Setting-up-Vector-Store/Importing-Modules-Required-for-Vector-Store">official guide</a> on how to get Teradata Bearer Token'
        this.inputs = [
            {
                label: 'Token',
                name: 'token',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: TeradataBearerTokenCredential }
