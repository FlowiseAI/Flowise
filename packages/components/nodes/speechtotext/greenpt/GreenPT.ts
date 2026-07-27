import { INode, INodeParams } from '../../../src/Interface'

class GreenPT_SpeechToText implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'GreenPT'
        this.name = 'greenPT'
        this.version = 1.0
        this.type = 'GreenPT'
        this.icon = 'greenpt.svg'
        this.category = 'SpeechToText'
        this.description =
            'GreenPT speech-to-text runs on optimized European infrastructure in data centers powered by 100% renewable energy.'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['greenPTApi']
        }
    }
}

module.exports = { nodeClass: GreenPT_SpeechToText }
