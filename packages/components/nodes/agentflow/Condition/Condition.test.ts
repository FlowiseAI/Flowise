const { nodeClass: Condition_Agentflow } = require('./Condition')
import { INodeData } from '../../../src/Interface'

function createNodeData(inputs: any): INodeData {
    return {
        id: 'condition-node',
        label: 'Condition',
        name: 'conditionAgentflow',
        type: 'Condition',
        icon: 'condition.svg',
        version: 1.0,
        category: 'Agent Flows',
        baseClasses: ['Condition'],
        inputs
    }
}

describe('Condition Agentflow', () => {
    let nodeClass: any

    beforeEach(() => {
        nodeClass = new Condition_Agentflow()
    })

    it('should match regex operation for string conditions', async () => {
        const nodeData = createNodeData({
            conditions: [
                {
                    type: 'string',
                    value1: 'Hello123',
                    operation: 'regex',
                    value2: '^Hello\\d+$'
                }
            ]
        })

        const result = await nodeClass.run(nodeData, '', { agentflowRuntime: { state: {} } })
        expect(result.output.conditions[0].isFulfilled).toBe(true)
        expect(result.output.conditions[1].isFulfilled).toBe(false)
    })

    it('should return false for invalid regex patterns', async () => {
        const nodeData = createNodeData({
            conditions: [
                {
                    type: 'string',
                    value1: 'Hello123',
                    operation: 'regex',
                    value2: '[invalid'
                }
            ]
        })

        const result = await nodeClass.run(nodeData, '', { agentflowRuntime: { state: {} } })
        expect(result.output.conditions[0].isFulfilled).toBe(false)
        expect(result.output.conditions[1].isFulfilled).toBe(true)
    })
})
