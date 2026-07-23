import { INodeParams, INodeCredential } from '../src/Interface'

class LMStudioApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'LM Studio API'
        this.name = 'lmStudioApi'
        this.version = 1.0
        this.description =
            'Refer to <a target="_blank" href="https://lmstudio.ai/docs/developer/core/authentication">official guide</a> on how to get access token on LmStudio'

        this.inputs = [
            {
                label: 'LM Studio Api Key',
                name: 'lmStudioApiKey',
                type: 'password',
                placeholder: '<LM_STUDIO_ACCESS_TOKEN>'
            }
        ]
    }
}

module.exports = { credClass: LMStudioApi }
