import { INode, INodeData, INodeParams, INodeOutputsValue } from '../../../src/Interface'

class NewLoop_Utilities implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    tags: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'New Loop'
        this.name = 'newLoop'
        this.version = 1.0
        this.type = 'group'
        this.icon = 'loop.svg'
        this.category = 'Utilities'
        this.description = 'Create a loop group with start and end nodes'
        this.baseClasses = [this.type, 'Utilities']
        this.tags = ['Utilities', 'Flow Control']
        this.inputs = [
            {
                label: 'Group Name',
                name: 'groupName',
                type: 'string',
                default: 'Loop Group'
            }
        ]
        this.outputs = [
            {
                label: 'Output',
                name: 'output',
                baseClasses: ['string', 'number', 'boolean', 'json', 'array', 'any'],
                description: 'Loop group output'
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const groupName = (nodeData.inputs?.groupName as string) || 'Loop Group'
        const nodeId = nodeData.id || 'group'

        // 创建组节点和子节点
        const groupNode = {
            id: nodeId,
            type: 'group',
            data: {
                name: this.name,
                label: groupName,
                inputs: nodeData.inputs || {},
                outputs: this.outputs
            },
            position: { x: 0, y: 0 },
            style: {
                width: 170,
                height: 140,
                backgroundColor: 'rgba(240, 240, 240, 0.5)'
            }
        }

        const startNode = {
            id: `${nodeId}-start`,
            type: 'customNode',
            data: {
                name: 'start',
                label: 'Start Node',
                inputs: {},
                outputs: [
                    {
                        label: 'Output',
                        name: 'output',
                        type: 'any'
                    }
                ]
            },
            position: { x: 10, y: 10 },
            parentNode: nodeId,
            extent: 'parent',
            draggable: true,
            style: {
                width: 150,
                border: '1px solid #2E7D32',
                borderRadius: '5px'
            }
        }

        const endNode = {
            id: `${nodeId}-end`,
            type: 'customNode',
            data: {
                name: 'end',
                label: 'End Node',
                inputs: {
                    input: ''
                },
                outputs: []
            },
            position: { x: 10, y: 90 },
            parentNode: nodeId,
            extent: 'parent',
            draggable: true,
            style: {
                width: 150,
                border: '1px solid #c62828',
                borderRadius: '5px'
            }
        }

        return {
            output: [groupNode, startNode, endNode]
        }
    }
}

module.exports = { nodeClass: NewLoop_Utilities }
