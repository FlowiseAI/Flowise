import { INodeParams, INodeCredential } from '../src/Interface'

class FigmaApi implements INodeCredential {
    label: string
    name: string
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Figma API'
        this.name = 'figmaApi'
        this.description =
            'Refer to <a target="_blank" href="https://www.figma.com/developers/api#access-tokens">official guide</a> on how to get accessToken on Figma'
        this.inputs = [
            {
                label: 'Access Token',
                name: 'accessToken',
                type: 'password',
                placeholder: '<FIGMA_ACCESS_TOKEN>'
            }
        ]
    }
}

module.exports = { credClass: FigmaApi }
