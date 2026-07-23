import { INodeParams, INodeCredential } from '../src/Interface'

class SerpdiveApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'SERPdive API'
        this.name = 'serpdiveApi'
        this.version = 1.0
        this.description =
            'SERPdive is a web search API for LLMs and AI agents that returns extracted, answer-ready page content. Every account gets 1,000 free credits per month'
        this.inputs = [
            {
                label: 'SERPdive Api Key',
                name: 'serpdiveApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: SerpdiveApi }