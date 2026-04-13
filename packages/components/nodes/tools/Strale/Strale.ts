import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { StraleSearchAndExecuteTool, StraleExecuteTool } from './core'

class Strale_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Strale'
        this.name = 'strale'
        this.version = 1.0
        this.type = 'Strale'
        this.icon = 'strale.svg'
        this.category = 'Tools'
        this.description = 'Access 290+ quality-tested data capabilities — company verification, sanctions screening, VAT validation, and more'
        this.inputs = [
            {
                label: 'API Key',
                name: 'straleApiKey',
                type: 'string',
                password: true,
                optional: true,
                description: 'Strale API key from https://strale.dev. Optional — 5 free capabilities work without auth.'
            },
            {
                label: 'Tool Mode',
                name: 'toolMode',
                type: 'options',
                options: [
                    {
                        label: 'Search and execute',
                        name: 'searchAndExecute',
                        description: 'Agent describes what it needs; Strale finds and runs the best capability'
                    },
                    {
                        label: 'Execute a specific capability',
                        name: 'executeSpecific',
                        description: 'Execute a pre-configured capability by slug'
                    }
                ],
                default: 'searchAndExecute',
                description: 'How the agent interacts with Strale'
            },
            {
                label: 'Capability Slug',
                name: 'capabilitySlug',
                type: 'string',
                optional: true,
                description:
                    'The capability to execute (e.g. "vat-validate", "swedish-company-data"). Required when Tool Mode is "Execute a specific capability". Browse capabilities at https://strale.dev.',
                placeholder: 'e.g. vat-validate'
            },
            {
                label: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                optional: true,
                additionalParams: true,
                default: 'https://api.strale.io',
                description: 'Override the Strale API base URL (for self-hosted or development use)'
            }
        ]
        this.baseClasses = [this.type, ...getBaseClasses(StraleSearchAndExecuteTool), 'Tool']
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const apiKey = nodeData.inputs?.straleApiKey as string
        const toolMode = nodeData.inputs?.toolMode as string
        const capabilitySlug = nodeData.inputs?.capabilitySlug as string
        const baseUrl = nodeData.inputs?.baseUrl as string

        const config = {
            apiKey: apiKey || undefined,
            baseUrl: baseUrl || undefined
        }

        if (toolMode === 'executeSpecific') {
            if (!capabilitySlug) {
                throw new Error('Capability Slug is required when Tool Mode is "Execute a specific capability"')
            }
            return new StraleExecuteTool({ ...config, capabilitySlug })
        }

        return new StraleSearchAndExecuteTool(config)
    }
}

module.exports = { nodeClass: Strale_Tools }
