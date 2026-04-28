import { INode, INodeParams } from '../../../src/Interface'

class AssemblyAI_SpeechToText implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs?: INodeParams[]
    credential: INodeParams

    constructor() {
        this.label = 'AssemblyAI'
        this.name = 'assemblyAI'
        this.version = 1.0
        this.type = 'AssemblyAI'
        this.icon = 'assemblyai.png'
        this.category = 'SpeechToText'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['assemblyAIApi']
        }
    }
}

module.exports = { nodeClass: AssemblyAI_SpeechToText }
