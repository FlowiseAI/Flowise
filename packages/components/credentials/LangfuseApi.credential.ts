import { INodeParams, INodeCredential } from '../src/Interface'

class LangfuseApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Langfuse API'
        this.name = 'langfuseApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://langfuse.com/docs/get-started/">official guide</a> on how to get API key on Langfuse'
        this.inputs = [
            {
                label: 'Secret Key',
                name: 'langFuseSecretKey',
                type: 'password',
                placeholder: 'sk-lf-abcdefg'
            },
            {
                label: 'Public Key',
                name: 'langFusePublicKey',
                type: 'string',
                placeholder: 'pk-lf-abcdefg'
            },
            {
                label: 'Endpoint',
                name: 'langFuseEndpoint',
                type: 'string',
                default: 'https://cloud.langfuse.com'
            }
        ]
    }
}

module.exports = { credClass: LangfuseApi }
