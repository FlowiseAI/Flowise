import { INode, INodeParams } from '../../../src/Interface'

class LLMonitor_Analytic implements INode {
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
        this.label = 'LLMonitor'
        this.name = 'llmonitor'
        this.version = 1.0
        this.type = 'LLMonitor'
        this.icon = 'llmonitor.png'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['llmonitorApi']
        }
    }
}

module.exports = { nodeClass: LLMonitor_Analytic }
