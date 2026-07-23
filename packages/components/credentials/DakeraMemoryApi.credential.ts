import { INodeParams, INodeCredential } from '../src/Interface'

class DakeraMemoryApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Dakera Memory API'
        this.name = 'dakeraMemoryApi'
        this.version = 1.0
        this.description =
            'Connect to your self-hosted <a target="_blank" href="https://dakera.ai">Dakera</a> memory server. ' +
            'Start locally: <code>docker run -p 3000:3000 -e DAKERA_API_KEY=your-key dakera/dakera:latest</code>'
        this.inputs = [
            {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                description: 'Your Dakera API key (set via DAKERA_API_KEY when starting the server)'
            }
        ]
    }
}

module.exports = { credClass: DakeraMemoryApi }
