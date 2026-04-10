import type { InputParam } from '../types'

import { conditionMatches, evaluateFieldVisibility, evaluateParamVisibility, stripHiddenFieldValues } from './fieldVisibility'

const makeParam = (overrides: Partial<InputParam> = {}): InputParam => ({
    id: 'p1',
    name: 'field1',
    label: 'Field 1',
    type: 'string',
    ...overrides
})

describe('conditionMatches', () => {
    it('returns true for array-array intersection', () => {
        expect(conditionMatches(['a', 'b'], ['b', 'c'])).toBe(true)
    })

    it('returns false for array-array no intersection', () => {
        expect(conditionMatches(['a', 'b'], ['c', 'd'])).toBe(false)
    })

    it('matches string in array ground value', () => {
        expect(conditionMatches(['api', 'cloud'], 'api')).toBe(true)
        expect(conditionMatches(['api', 'cloud'], 'local')).toBe(false)
    })

    it('matches regex against array ground value', () => {
        expect(conditionMatches(['gpt-4', 'gpt-3.5'], 'gpt-.*')).toBe(true)
        expect(conditionMatches(['claude-3'], 'gpt-.*')).toBe(false)
    })

    it('matches boolean/number in array ground value', () => {
        expect(conditionMatches([true, false], true)).toBe(true)
        expect(conditionMatches([1, 2, 3], 2)).toBe(true)
        expect(conditionMatches([1, 2], 5)).toBe(false)
    })

    it('matches object in array via deep equality', () => {
        expect(conditionMatches([{ a: 1 }, { b: 2 }], { b: 2 })).toBe(true)
        expect(conditionMatches([{ a: 1 }], { a: 2 })).toBe(false)
    })

    it('scalar includes check against comparison array', () => {
        expect(conditionMatches('api', ['api', 'cloud'])).toBe(true)
        expect(conditionMatches('local', ['api', 'cloud'])).toBe(false)
    })

    it('scalar exact match with string', () => {
        expect(conditionMatches('hello', 'hello')).toBe(true)
        expect(conditionMatches('hello', 'world')).toBe(false)
    })

    it('scalar regex match', () => {
        expect(conditionMatches('gpt-4-turbo', 'gpt-.*')).toBe(true)
        expect(conditionMatches('claude-3', 'gpt-.*')).toBe(false)
    })

    it('dot in comparison value is literal, not regex wildcard', () => {
        expect(conditionMatches('gpt-445', 'gpt-4.5')).toBe(false)
        expect(conditionMatches('gpt-4.5', 'gpt-4.5')).toBe(true)
    })

    it('dot in comparison value is literal in array ground', () => {
        expect(conditionMatches(['gpt-445'], 'gpt-4.5')).toBe(false)
        expect(conditionMatches(['gpt-4.5'], 'gpt-4.5')).toBe(true)
    })

    it('regex alternation pattern still works', () => {
        expect(conditionMatches('openAI', '(openAI|google)')).toBe(true)
        expect(conditionMatches('anthropic', '(openAI|google)')).toBe(false)
    })

    it('regex wildcard pattern still works', () => {
        expect(conditionMatches('gpt-4-turbo', 'gpt-.*')).toBe(true)
        expect(conditionMatches('claude-3', 'gpt-.*')).toBe(false)
    })

    it('invalid regex does not throw, returns false', () => {
        expect(conditionMatches('test', '[invalid')).toBe(false)
    })

    it('rejects oversized regex patterns to mitigate ReDoS', () => {
        const longPattern = '(a+)'.repeat(60) // exceeds 200 char limit
        expect(conditionMatches('aaa', longPattern)).toBe(false)
        expect(conditionMatches(['aaa'], longPattern)).toBe(false)
    })

    it('rejects nested quantifier patterns to mitigate ReDoS', () => {
        // Build patterns dynamically to avoid tripping CodeQL's static ReDoS scanner
        const nestedPlus = ['(a', '+)', '+$'].join('')
        const nestedStar = ['(a', '*)', '*'].join('')
        const altQuantified = ['(a|a', 'a)', '+'].join('')
        const spaceQuantified = ['(a', '+ )', '+'].join('')
        expect(conditionMatches('aaa', nestedPlus)).toBe(false)
        expect(conditionMatches(['aaa'], nestedStar)).toBe(false)
        expect(conditionMatches('aaa', altQuantified)).toBe(false)
        expect(conditionMatches('aaa', spaceQuantified)).toBe(false)
    })

    it('allows safe patterns with groups and quantifiers', () => {
        // Non-nested: group without inner quantifier/alt, followed by quantifier
        expect(conditionMatches('aaa', '(a)+')).toBe(true)
        expect(conditionMatches('abc', '(abc)+')).toBe(true)
    })

    it('scalar boolean strict equality', () => {
        expect(conditionMatches(true, true)).toBe(true)
        expect(conditionMatches(true, false)).toBe(false)
    })

    it('scalar number strict equality', () => {
        expect(conditionMatches(42, 42)).toBe(true)
        expect(conditionMatches(42, 99)).toBe(false)
    })

    it('scalar deep object equality', () => {
        expect(conditionMatches({ a: 1, b: [2] }, { a: 1, b: [2] })).toBe(true)
        expect(conditionMatches({ a: 1 }, { a: 2 })).toBe(false)
    })
})

describe('evaluateParamVisibility', () => {
    it('returns true when no conditions', () => {
        expect(evaluateParamVisibility(makeParam(), {})).toBe(true)
    })

    it('show match returns true', () => {
        const param = makeParam({ show: { mode: 'api' } })
        expect(evaluateParamVisibility(param, { mode: 'api' })).toBe(true)
    })

    it('show mismatch returns false', () => {
        const param = makeParam({ show: { mode: 'api' } })
        expect(evaluateParamVisibility(param, { mode: 'local' })).toBe(false)
    })

    it('hide match returns false', () => {
        const param = makeParam({ hide: { mode: 'api' } })
        expect(evaluateParamVisibility(param, { mode: 'api' })).toBe(false)
    })

    it('hide mismatch returns true', () => {
        const param = makeParam({ hide: { mode: 'api' } })
        expect(evaluateParamVisibility(param, { mode: 'local' })).toBe(true)
    })

    it('handles array comparison value with scalar ground', () => {
        const param = makeParam({ show: { mode: ['api', 'cloud'] } })
        expect(evaluateParamVisibility(param, { mode: 'api' })).toBe(true)
        expect(evaluateParamVisibility(param, { mode: 'local' })).toBe(false)
    })

    it('resolves nested path via lodash get', () => {
        const param = makeParam({ show: { 'config.nested.field': 'yes' } })
        expect(evaluateParamVisibility(param, { config: { nested: { field: 'yes' } } })).toBe(true)
        expect(evaluateParamVisibility(param, { config: { nested: { field: 'no' } } })).toBe(false)
    })

    it('resolves $index placeholder', () => {
        const param = makeParam({ show: { 'items.$index.type': 'text' } })
        const values = { items: [{ type: 'text' }, { type: 'image' }] }
        expect(evaluateParamVisibility(param, values, 0)).toBe(true)
        expect(evaluateParamVisibility(param, values, 1)).toBe(false)
    })

    it('parses JSON-encoded array string in ground value', () => {
        const param = makeParam({ show: { tools: 'search' } })
        expect(evaluateParamVisibility(param, { tools: '["search","browse"]' })).toBe(true)
    })

    it('multiple show conditions act as AND', () => {
        const param = makeParam({ show: { mode: 'api', provider: 'openai' } })
        expect(evaluateParamVisibility(param, { mode: 'api', provider: 'openai' })).toBe(true)
        expect(evaluateParamVisibility(param, { mode: 'api', provider: 'azure' })).toBe(false)
    })

    it('combined show+hide: show passes but hide also matches returns false', () => {
        const param = makeParam({ show: { mode: 'api' }, hide: { provider: 'azure' } })
        expect(evaluateParamVisibility(param, { mode: 'api', provider: 'azure' })).toBe(false)
    })
})

describe('evaluateFieldVisibility', () => {
    it('returns new array with computed display, does not mutate originals', () => {
        const params = [makeParam({ name: 'a', show: { mode: 'api' } }), makeParam({ name: 'b', hide: { mode: 'api' } })]
        const values = { mode: 'api' }

        const result = evaluateFieldVisibility(params, values)

        expect(result).toHaveLength(2)
        expect(result[0].display).toBe(true)
        expect(result[1].display).toBe(false)
        // Originals unchanged
        expect(params[0].display).toBeUndefined()
        expect(params[1].display).toBeUndefined()
    })
})

describe('evaluateFieldVisibility – nested array $index pattern (Start node formInputTypes)', () => {
    // Mirrors the Start node's formInputTypes definition:
    // addOptions has show: { 'formInputTypes[$index].type': 'options' }
    const addOptionsParam = makeParam({
        name: 'addOptions',
        label: 'Add Options',
        type: 'array',
        show: { 'formInputTypes[$index].type': 'options' }
    })

    const typeParam = makeParam({ name: 'type', label: 'Type', type: 'options' })
    const labelParam = makeParam({ name: 'label', label: 'Label', type: 'string' })

    const arraySubFields = [typeParam, labelParam, addOptionsParam]

    it('shows addOptions when type is "options" at given index', () => {
        const inputValues = {
            formInputTypes: [
                { type: 'options', label: 'Pick one' },
                { type: 'string', label: 'Name' }
            ]
        }

        const row0 = evaluateFieldVisibility(arraySubFields, inputValues, 0)
        expect(row0.find((p) => p.name === 'addOptions')!.display).toBe(true)
        expect(row0.find((p) => p.name === 'type')!.display).toBe(true)

        const row1 = evaluateFieldVisibility(arraySubFields, inputValues, 1)
        expect(row1.find((p) => p.name === 'addOptions')!.display).toBe(false)
        expect(row1.find((p) => p.name === 'type')!.display).toBe(true)
    })

    it('hides addOptions when type changes from "options" to "string"', () => {
        const inputValues = {
            formInputTypes: [{ type: 'string', label: 'Name' }]
        }

        const row0 = evaluateFieldVisibility(arraySubFields, inputValues, 0)
        expect(row0.find((p) => p.name === 'addOptions')!.display).toBe(false)
    })

    it('handles missing array gracefully (defaults to empty)', () => {
        const inputValues = {} // formInputTypes not yet set
        const row0 = evaluateFieldVisibility(arraySubFields, inputValues, 0)
        expect(row0.find((p) => p.name === 'addOptions')!.display).toBe(false)
    })
})

describe('stripHiddenFieldValues', () => {
    it('removes hidden keys and retains visible ones', () => {
        const params = [makeParam({ name: 'visible', show: { mode: 'api' } }), makeParam({ name: 'hidden', hide: { mode: 'api' } })]
        const values = { mode: 'api', visible: 'yes', hidden: 'secret' }

        const result = stripHiddenFieldValues(params, values)

        expect(result).toHaveProperty('visible', 'yes')
        expect(result).not.toHaveProperty('hidden')
        expect(result).toHaveProperty('mode', 'api')
    })
})
