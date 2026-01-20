import { nodeClass as Condition_Agentflow } from './Condition'
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
        const matchedCondition = result.output.conditions.find(
            (condition: any) => condition.operation === 'regex' && condition.value1 === 'Hello123' && condition.value2 === '^Hello\\d+$'
        )
        const elseCondition = result.output.conditions.find(
            (condition: any) => condition.operation === 'equal' && condition.value1 === '' && condition.value2 === ''
        )
        expect(matchedCondition?.isFulfilled).toBe(true)
        expect(elseCondition?.isFulfilled).toBe(false)
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
        const matchedCondition = result.output.conditions.find(
            (condition: any) => condition.operation === 'regex' && condition.value1 === 'Hello123' && condition.value2 === '[invalid'
        )
        const elseCondition = result.output.conditions.find(
            (condition: any) => condition.operation === 'equal' && condition.value1 === '' && condition.value2 === ''
        )
        expect(matchedCondition?.isFulfilled).toBe(false)
        expect(elseCondition?.isFulfilled).toBe(true)
    })

    it('should return false when regex exceeds safety limits', async () => {
        const nodeData = createNodeData({
            conditions: [
                {
                    type: 'string',
                    value1: 'Hello123',
                    operation: 'regex',
                    value2: 'a'.repeat(300)
                }
            ]
        })

        const result = await nodeClass.run(nodeData, '', { agentflowRuntime: { state: {} } })
        const matchedCondition = result.output.conditions.find(
            (condition: any) => condition.operation === 'regex' && condition.value2 === 'a'.repeat(300)
        )
        const elseCondition = result.output.conditions.find(
            (condition: any) => condition.operation === 'equal' && condition.value1 === '' && condition.value2 === ''
        )
        expect(matchedCondition?.isFulfilled).toBeFalsy()
        expect(elseCondition?.isFulfilled).toBe(true)
    })
})
