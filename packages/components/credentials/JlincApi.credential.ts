import { INodeParams, INodeCredential } from '../src/Interface'

class JlincApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'JLINC API'
        this.name = 'jlincApi'
        this.version = 1.0
        this.description = 'Refer to <a target="_blank" href="https://www.jlinc.com">https://www.jlinc.com</a>.'
        this.inputs = [
            {
                label: 'Data Store API URL',
                name: 'dataStoreApiUrl',
                type: 'string',
                placeholder: 'https://api-test.jlinc.io'
            },
            {
                label: 'Data Store API Key',
                name: 'dataStoreApiKey',
                type: 'password',
                placeholder: '<DATA_STORE_API_KEY>'
            },
            {
                label: 'Archive API URL',
                name: 'archiveApiUrl',
                type: 'string',
                placeholder: 'https://archive-test.jlinc.io'
            },
            {
                label: 'Archive API Key',
                name: 'archiveApiKey',
                type: 'password',
                placeholder: '<ARCHIVE_API_KEY>'
            }
        ]
    }
}

module.exports = { credClass: JlincApi }
