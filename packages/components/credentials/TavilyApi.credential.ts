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
        this.version = 1.0
        this.description = 'Tavily API is a real-time API to access Google search results'
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
