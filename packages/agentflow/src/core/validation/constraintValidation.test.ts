import { makeFlowNode } from '@test-utils/factories'

import {
    checkHumanInputInIteration,
    checkNestedIteration,
    checkNodePlacementConstraints,
    checkSingleStartNode,
    findParentIterationNode
} from './constraintValidation'

describe('checkSingleStartNode', () => {
    it('should reject when a start node already exists', () => {
        const nodes = [makeFlowNode('a', { data: { id: 'a', name: 'startAgentflow', label: 'Start' } })]
        const result = checkSingleStartNode(nodes, 'startAgentflow')
        expect(result.valid).toBe(false)
        expect(result.message).toContain('Only one start node')
    })

    it('should allow when no start node exists', () => {
        const nodes = [makeFlowNode('a', { data: { id: 'a', name: 'llmAgentflow', label: 'LLM' } })]
        const result = checkSingleStartNode(nodes, 'startAgentflow')
        expect(result.valid).toBe(true)
    })

    it('should allow non-start nodes regardless', () => {
        const nodes = [makeFlowNode('a', { data: { id: 'a', name: 'startAgentflow', label: 'Start' } })]
        const result = checkSingleStartNode(nodes, 'llmAgentflow')
        expect(result.valid).toBe(true)
    })
})

describe('checkNestedIteration', () => {
    it('should reject iteration inside iteration', () => {
        const parent = makeFlowNode('iter', { type: 'iteration', data: { id: 'iter', name: 'iterationAgentflow', label: 'Iteration' } })
        const result = checkNestedIteration('iterationAgentflow', parent)
        expect(result.valid).toBe(false)
        expect(result.message).toContain('Nested iteration')
    })

    it('should allow iteration outside iteration', () => {
        const result = checkNestedIteration('iterationAgentflow', null)
        expect(result.valid).toBe(true)
    })

    it('should allow non-iteration nodes inside iteration', () => {
        const parent = makeFlowNode('iter', { type: 'iteration', data: { id: 'iter', name: 'iterationAgentflow', label: 'Iteration' } })
        const result = checkNestedIteration('llmAgentflow', parent)
        expect(result.valid).toBe(true)
    })
})

describe('checkHumanInputInIteration', () => {
    it('should reject human input inside iteration', () => {
        const parent = makeFlowNode('iter', { type: 'iteration', data: { id: 'iter', name: 'iterationAgentflow', label: 'Iteration' } })
        const result = checkHumanInputInIteration('humanInputAgentflow', parent)
        expect(result.valid).toBe(false)
        expect(result.message).toContain('Human input node')
    })

    it('should allow human input outside iteration', () => {
        const result = checkHumanInputInIteration('humanInputAgentflow', null)
        expect(result.valid).toBe(true)
    })

    it('should allow non-human-input nodes inside iteration', () => {
        const parent = makeFlowNode('iter', { type: 'iteration', data: { id: 'iter', name: 'iterationAgentflow', label: 'Iteration' } })
        const result = checkHumanInputInIteration('llmAgentflow', parent)
        expect(result.valid).toBe(true)
    })
})

describe('checkNodePlacementConstraints', () => {
    it('should reject duplicate start node', () => {
        const nodes = [makeFlowNode('a', { data: { id: 'a', name: 'startAgentflow', label: 'Start' } })]
        const result = checkNodePlacementConstraints(nodes, 'startAgentflow')
        expect(result.valid).toBe(false)
        expect(result.message).toContain('Only one start node')
    })

    it('should reject nested iteration when position is inside an iteration node', () => {
        const iterNode = makeFlowNode('iter', {
            type: 'iteration',
            position: { x: 100, y: 100 },
            width: 400,
            height: 300,
            data: { id: 'iter', name: 'iterationAgentflow', label: 'Iteration' }
        })
        const result = checkNodePlacementConstraints([iterNode], 'iterationAgentflow', { x: 200, y: 200 })
        expect(result.valid).toBe(false)
        expect(result.message).toContain('Nested iteration')
    })

    it('should reject human input inside iteration', () => {
        const iterNode = makeFlowNode('iter', {
            type: 'iteration',
            position: { x: 100, y: 100 },
            width: 400,
            height: 300,
            data: { id: 'iter', name: 'iterationAgentflow', label: 'Iteration' }
        })
        const result = checkNodePlacementConstraints([iterNode], 'humanInputAgentflow', { x: 200, y: 200 })
        expect(result.valid).toBe(false)
        expect(result.message).toContain('Human input node')
    })

    it('should pass when all constraints are satisfied', () => {
        const nodes = [makeFlowNode('a', { data: { id: 'a', name: 'llmAgentflow', label: 'LLM' } })]
        const result = checkNodePlacementConstraints(nodes, 'llmAgentflow', { x: 50, y: 50 })
        expect(result.valid).toBe(true)
    })

    it('should pass when no position is provided', () => {
        const nodes = [makeFlowNode('a', { data: { id: 'a', name: 'llmAgentflow', label: 'LLM' } })]
        const result = checkNodePlacementConstraints(nodes, 'llmAgentflow')
        expect(result.valid).toBe(true)
    })
})

describe('findParentIterationNode', () => {
    it('should return iteration node when position is inside', () => {
        const iterNode = makeFlowNode('iter', {
            type: 'iteration',
            position: { x: 100, y: 100 },
            width: 400,
            height: 300,
            data: { id: 'iter', name: 'iterationAgentflow', label: 'Iteration' }
        })
        const result = findParentIterationNode([iterNode], { x: 200, y: 200 })
        expect(result).toBe(iterNode)
    })

    it('should return null when position is outside all iteration nodes', () => {
        const iterNode = makeFlowNode('iter', {
            type: 'iteration',
            position: { x: 100, y: 100 },
            width: 400,
            height: 300,
            data: { id: 'iter', name: 'iterationAgentflow', label: 'Iteration' }
        })
        const result = findParentIterationNode([iterNode], { x: 600, y: 600 })
        expect(result).toBeNull()
    })

    it('should return null when there are no iteration nodes', () => {
        const node = makeFlowNode('a', { data: { id: 'a', name: 'llmAgentflow', label: 'LLM' } })
        const result = findParentIterationNode([node], { x: 0, y: 0 })
        expect(result).toBeNull()
    })
})
