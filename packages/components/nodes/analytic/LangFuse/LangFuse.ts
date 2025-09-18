import { INode, INodeParams } from '../../../src/Interface'

class LangFuse_Analytic implements INode {
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
        this.label = 'LangFuse'
        this.name = 'langFuse'
        this.version = 1.0
        this.type = 'LangFuse'
        this.icon = 'Langfuse.svg'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['langfuseApi']
        }
    }
}

module.exports = { nodeClass: LangFuse_Analytic }
