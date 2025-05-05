import { INodeParams, INodeCredential } from '../src/Interface'

class TavilyApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Tavily API'
        this.name = 'tavilyApi'
        this.version = 1.1
        this.description = 'Tavily API is a search engine designed for LLMs and AI agents'
        this.inputs = [
            {
                label: 'Tavily Api Key',
                name: 'tavilyApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: TavilyApi }
