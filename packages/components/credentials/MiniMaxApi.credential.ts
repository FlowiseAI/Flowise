import { INodeParams, INodeCredential } from '../src/Interface'

class MiniMaxApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'MiniMax API'
        this.name = 'miniMaxApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'MiniMax API Key',
                name: 'miniMaxApiKey',
                type: 'password'
            },
            {
                label: 'TTS API Region',
                name: 'miniMaxTTSRegion',
                type: 'options',
                options: [
                    {
                        label: 'Global',
                        name: 'global_en'
                    },
                    {
                        label: 'China',
                        name: 'cn_zh'
                    }
                ],
                default: 'global_en'
            }
        ]
    }
}

module.exports = { credClass: MiniMaxApi }
