import { INodeParams, INodeCredential } from '../src/Interface'

class GoogleMakerSuite implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Google MakerSuite'
        this.name = 'googleMakerSuite'
        this.version = 1.0
        this.inputs = [
            {
                label: 'MakerSuite API Key',
                name: 'googleMakerSuiteKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: GoogleMakerSuite }
