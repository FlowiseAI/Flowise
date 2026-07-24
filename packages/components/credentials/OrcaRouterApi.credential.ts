import { INodeParams, INodeCredential } from '../src/Interface'

class OrcaRouterAPIAuth implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'OrcaRouter API Key'
        this.name = 'orcaRouterApi'
        this.version = 1.0
        this.description =
            'Sign up at <a target="_blank" href="https://www.orcarouter.ai">https://www.orcarouter.ai</a> and create an API key at the <a target="_blank" href="https://www.orcarouter.ai/console">console</a>. Keys begin with <code>sk-orca-</code>.'
        this.inputs = [
            {
                label: 'OrcaRouter API Key',
                name: 'orcaRouterApiKey',
                type: 'password',
                description: 'API key issued by OrcaRouter (starts with sk-orca-).'
            }
        ]
    }
}

module.exports = { credClass: OrcaRouterAPIAuth }
