import { INodeParams, INodeCredential } from '../src/Interface'

class GoogleVertexAuth implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google Vertex Auth'
        this.name = 'googleVertexAuth'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Google Application Credential File Path',
                name: 'googleApplicationCredentialFilePath',
                description: 'Path to your google application credential json file',
                placeholder: 'your-path/application_default_credentials.json',
                type: 'string'
            }
        ]
    }
}

module.exports = { credClass: GoogleVertexAuth }
