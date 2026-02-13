import { makeNodeData } from '@test-utils/factories'

import { debounce, fuzzyScore, searchNodes } from './search'

describe('fuzzyScore', () => {
    it('should return 0 for empty search term', () => {
        expect(fuzzyScore('', 'some text')).toBe(0)
    })

    it('should return 0 for null/undefined search term', () => {
        expect(fuzzyScore(null as unknown as string, 'text')).toBe(0)
        expect(fuzzyScore(undefined as unknown as string, 'text')).toBe(0)
    })

    it('should return 0 when no characters match', () => {
        expect(fuzzyScore('xyz', 'abc')).toBe(0)
    })

    it('should return 0 when not all search characters are found', () => {
        expect(fuzzyScore('abz', 'abc')).toBe(0)
    })

    describe('exact substring matches', () => {
        it('should give high score for exact match at start', () => {
            const score = fuzzyScore('start', 'startAgentflow')
            expect(score).toBeGreaterThanOrEqual(1100) // 1000 base + 200 start bonus - length penalty
        })

        it('should give bonus for match at word boundary', () => {
            const atBoundary = fuzzyScore('agent', 'start-agent')
            const inMiddle = fuzzyScore('gent', 'startgentflow')
            expect(atBoundary).toBeGreaterThan(inMiddle)
        })

        it('should penalize matches further into the string', () => {
            const early = fuzzyScore('llm', 'llmAgentflow')
            const late = fuzzyScore('llm', 'somethingllm')
            expect(early).toBeGreaterThan(late)
        })

        it('should favor shorter targets (more precise match)', () => {
            const short = fuzzyScore('llm', 'llm')
            const long = fuzzyScore('llm', 'llmAgentflowSomethingElse')
            expect(short).toBeGreaterThan(long)
        })
    })

    describe('fuzzy matches', () => {
        it('should score consecutive character matches higher', () => {
            const consecutive = fuzzyScore('abc', 'abcdef') // exact substring
            const scattered = fuzzyScore('adf', 'abcdef') // fuzzy
            expect(consecutive).toBeGreaterThan(scattered)
        })

        it('should give bonus for match at start of string', () => {
            const startMatch = fuzzyScore('a', 'abcdef')
            const midMatch = fuzzyScore('c', 'abcdef')
            expect(startMatch).toBeGreaterThan(midMatch)
        })

        it('should give bonus for word boundary matches', () => {
            const boundary = fuzzyScore('sa', 'start agentflow') // 'a' at word boundary
            // score should include word boundary bonus
            expect(boundary).toBeGreaterThan(0)
        })
    })
})

describe('searchNodes', () => {
    const makeNode = (name: string, label: string, category?: string, description?: string) =>
        makeNodeData({ name, label, category, description })

    const nodes = [
        makeNode('llmAgentflow', 'LLM', 'Agent Flows', 'Language model node'),
        makeNode('agentAgentflow', 'Agent', 'Agent Flows', 'Autonomous agent'),
        makeNode('startAgentflow', 'Start', 'Agent Flows', 'Entry point'),
        makeNode('httpAgentflow', 'HTTP Request', 'Agent Flows', 'Make HTTP calls')
    ]

    it('should return all nodes when search is empty', () => {
        expect(searchNodes(nodes, '')).toEqual(nodes)
        expect(searchNodes(nodes, '  ')).toEqual(nodes)
    })

    it('should filter nodes by name match', () => {
        const results = searchNodes(nodes, 'llm')
        expect(results.length).toBeGreaterThanOrEqual(1)
        expect(results[0].name).toBe('llmAgentflow')
    })

    it('should filter nodes by label match', () => {
        const results = searchNodes(nodes, 'HTTP')
        expect(results.length).toBeGreaterThanOrEqual(1)
        expect(results[0].name).toBe('httpAgentflow')
    })

    it('should return empty array when no nodes match', () => {
        expect(searchNodes(nodes, 'zzzzz')).toEqual([])
    })

    it('should rank exact matches higher', () => {
        const results = searchNodes(nodes, 'agent')
        // 'agentAgentflow' should rank higher than others since 'agent' is in its name and label
        expect(results[0].name).toBe('agentAgentflow')
    })

    it('should search across description field', () => {
        const results = searchNodes(nodes, 'autonomous')
        expect(results.length).toBeGreaterThanOrEqual(1)
        expect(results[0].name).toBe('agentAgentflow')
    })
})

describe('debounce', () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('should delay function execution', () => {
        const fn = jest.fn()
        const debounced = debounce(fn, 300)

        debounced()
        expect(fn).not.toHaveBeenCalled()

        jest.advanceTimersByTime(300)
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should reset timer on subsequent calls', () => {
        const fn = jest.fn()
        const debounced = debounce(fn, 300)

        debounced()
        jest.advanceTimersByTime(200)
        debounced() // reset
        jest.advanceTimersByTime(200)
        expect(fn).not.toHaveBeenCalled()

        jest.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments to the debounced function', () => {
        const fn = jest.fn()
        const debounced = debounce(fn, 100)

        debounced('hello', 42)
        jest.advanceTimersByTime(100)
        expect(fn).toHaveBeenCalledWith('hello', 42)
    })
})
