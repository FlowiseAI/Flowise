import { INodeParams, INodeCredential } from '../src/Interface'

class UnstructuredTransformApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Unstructured Transform API'
        this.name = 'unstructuredTransformApi'
        this.version = 1.0
        this.description =
            'Sign in at <a target="_blank" href="https://transform.unstructured.io/get-started">Unstructured Transform</a> to get your API key. See the <a target="_blank" href="https://docs.unstructured.io/transform/quickstart">quickstart</a> for details.'
        this.inputs = [
            {
                label: 'API Key',
                name: 'unstructuredTransformAPIKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: UnstructuredTransformApi }
