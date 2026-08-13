import { INodeCredential, INodeParams } from '../src/Interface'

class AtlasCloudApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Atlas Cloud API'
        this.name = 'atlasCloudApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Atlas Cloud API Key',
                name: 'atlasCloudApiKey',
                type: 'password',
                description: 'Atlas Cloud API key. You can also set ATLASCLOUD_API_KEY or ATLAS_CLOUD_API_KEY.'
            }
        ]
    }
}

module.exports = { credClass: AtlasCloudApi }
