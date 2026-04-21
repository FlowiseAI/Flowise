import { INodeParams, INodeCredential } from '../src/Interface'

class Ip2GeoApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'ip2geo API'
        this.name = 'ip2GeoApi'
        this.version = 1.0
        this.description =
            'Get your API key from <a target="_blank" href="https://ip2geo.dev">ip2geo.dev</a>'
        this.inputs = [
            {
                label: 'ip2geo API Key',
                name: 'ip2GeoApiKey',
                type: 'password'
            }
        ]
    }
}

module.exports = { credClass: Ip2GeoApi }
