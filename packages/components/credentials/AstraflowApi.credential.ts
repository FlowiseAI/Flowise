import { INodeCredential, INodeParams } from '../src/Interface'

class AstraflowApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Astraflow API'
        this.name = 'astraflowApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Astraflow API Key',
                name: 'astraflowApiKey',
                type: 'password',
                description:
                    'Astraflow (UCloud) API key. Use a Global key for https://api-us-ca.umodelverse.ai/v1 (ASTRAFLOW_API_KEY) or a China key for https://api.modelverse.cn/v1 (ASTRAFLOW_CN_API_KEY).'
            }
        ]
    }
}

module.exports = { credClass: AstraflowApi }
