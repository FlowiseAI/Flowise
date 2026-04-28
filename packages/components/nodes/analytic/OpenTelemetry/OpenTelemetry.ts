import { INode, INodeParams } from '../../../src/Interface'

class OpenTelemetry_Analytic implements INode {
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
        this.label = 'OpenTelemetry'
        this.name = 'openTelemetry'
        this.version = 1.0
        this.type = 'OpenTelemetry'
        this.icon = 'otel.svg'
        this.category = 'Analytic'
        this.baseClasses = [this.type]
        this.inputs = []
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['openTelemetryApi']
        }
    }
}

module.exports = { nodeClass: OpenTelemetry_Analytic }
