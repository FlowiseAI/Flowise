import type { InputParam } from '../types'

import {
    applyVisibleFieldDefaults,
    conditionMatches,
    evaluateFieldVisibility,
    evaluateParamVisibility,
    stripHiddenFieldValues
} from './fieldVisibility'

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

    describe('option-level show/hide filtering', () => {
        it('removes options whose hide condition matches', () => {
            const param = makeParam({
                type: 'options',
                options: [
                    { label: 'String', name: 'string' },
                    { label: 'Object', name: 'object', hide: { contentType: 'application/x-www-form-urlencoded' } }
                ] as any
            })

            const result = evaluateFieldVisibility([param], { contentType: 'application/x-www-form-urlencoded' })
            expect(result[0].options).toHaveLength(1)
            expect(result[0].options![0]).toMatchObject({ name: 'string' })
        })

        it('keeps options whose hide condition does not match', () => {
            const param = makeParam({
                type: 'options',
                options: [
                    { label: 'String', name: 'string' },
                    { label: 'Object', name: 'object', hide: { contentType: 'application/x-www-form-urlencoded' } }
                ] as any
            })

            const result = evaluateFieldVisibility([param], { contentType: 'application/json' })
            expect(result[0].options).toHaveLength(2)
        })

        it('removes options whose show condition does not match', () => {
            const param = makeParam({
                type: 'options',
                options: [
                    { label: 'Basic', name: 'basic' },
                    { label: 'Advanced', name: 'advanced', show: { mode: 'expert' } }
                ] as any
            })

            const result = evaluateFieldVisibility([param], { mode: 'beginner' })
            expect(result[0].options).toHaveLength(1)
            expect(result[0].options![0]).toMatchObject({ name: 'basic' })
        })

        it('keeps options whose show condition matches', () => {
            const param = makeParam({
                type: 'options',
                options: [
                    { label: 'Basic', name: 'basic' },
                    { label: 'Advanced', name: 'advanced', show: { mode: 'expert' } }
                ] as any
            })

            const result = evaluateFieldVisibility([param], { mode: 'expert' })
            expect(result[0].options).toHaveLength(2)
        })

        it('passes through string options unchanged', () => {
            const param = makeParam({
                type: 'options',
                options: ['one', 'two', 'three'] as any
            })

            const result = evaluateFieldVisibility([param], {})
            expect(result[0].options).toHaveLength(3)
        })

        it('passes through options with no show/hide unchanged', () => {
            const param = makeParam({
                type: 'options',
                options: [
                    { label: 'A', name: 'a' },
                    { label: 'B', name: 'b' }
                ] as any
            })

            const result = evaluateFieldVisibility([param], {})
            expect(result[0].options).toHaveLength(2)
        })

        it('does not mutate the original options array', () => {
            const options = [
                { label: 'String', name: 'string' },
                { label: 'Object', name: 'object', hide: { contentType: 'application/x-www-form-urlencoded' } }
            ] as any
            const param = makeParam({ type: 'options', options })

            evaluateFieldVisibility([param], { contentType: 'application/x-www-form-urlencoded' })

            // Original options array is untouched
            expect(options).toHaveLength(2)
        })

        it('does not affect non-options params', () => {
            const param = makeParam({ type: 'string' })
            const result = evaluateFieldVisibility([param], {})
            expect(result[0].options).toBeUndefined()
        })
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

describe('evaluateFieldVisibility – declared defaults of sibling fields', () => {
    const scheduleTypeParam = makeParam({
        name: 'scheduleType',
        default: 'visualPicker',
        show: { startInputType: 'scheduleInput' }
    })
    const frequencyParam = makeParam({
        name: 'scheduleFrequency',
        show: { startInputType: 'scheduleInput', scheduleType: 'visualPicker' }
    })
    const defaultInputParam = makeParam({
        name: 'scheduleDefaultInput',
        show: { startInputType: 'scheduleInput', scheduleInputMode: 'text' }
    })
    const scheduleInputModeParam = makeParam({
        name: 'scheduleInputMode',
        default: 'text',
        show: { startInputType: 'scheduleInput' }
    })

    const params = [scheduleTypeParam, scheduleInputModeParam, frequencyParam, defaultInputParam]

    it('shows fields whose `show` references a sibling default value, even if the sibling key is absent', () => {
        const inputs = { startInputType: 'scheduleInput' }
        const result = evaluateFieldVisibility(params, inputs)
        const byName = Object.fromEntries(result.map((p) => [p.name, p.display]))

        expect(byName.scheduleType).toBe(true)
        expect(byName.scheduleInputMode).toBe(true)
        expect(byName.scheduleFrequency).toBe(true)
        expect(byName.scheduleDefaultInput).toBe(true)
    })

    it('explicit value overrides declared default', () => {
        // User explicitly chose cronExpression — Frequency must hide.
        const inputs = { startInputType: 'scheduleInput', scheduleType: 'cronExpression' }
        const result = evaluateFieldVisibility(params, inputs)
        const byName = Object.fromEntries(result.map((p) => [p.name, p.display]))

        expect(byName.scheduleFrequency).toBe(false)
    })

    it('does not synthesize defaults for fields that have no `default`', () => {
        // No declared default => stays missing => sibling show against it fails.
        const sibling = makeParam({ name: 'sib', show: { other: 'expected' } })
        const referenced = makeParam({ name: 'other' /* no default */ })
        const result = evaluateFieldVisibility([referenced, sibling], {})
        expect(result.find((p) => p.name === 'sib')!.display).toBe(false)
    })
})

describe('applyVisibleFieldDefaults', () => {
    const buildParams = (): InputParam[] => [
        makeParam({
            name: 'scheduleType',
            default: 'visualPicker',
            show: { startInputType: 'scheduleInput' }
        }),
        makeParam({
            name: 'scheduleInputMode',
            default: 'text',
            show: { startInputType: 'scheduleInput' }
        }),
        // Hidden in this scenario — its default must NOT be merged.
        makeParam({
            name: 'formTitle',
            default: 'Untitled Form',
            show: { startInputType: 'formInput' }
        }),
        // Visible but no default — stays missing.
        makeParam({
            name: 'scheduleFrequency',
            show: { startInputType: 'scheduleInput', scheduleType: 'visualPicker' }
        })
    ]

    it('writes declared defaults for currently visible fields whose value is missing', () => {
        const params = buildParams()
        const result = applyVisibleFieldDefaults(params, { startInputType: 'scheduleInput' })

        expect(result.scheduleType).toBe('visualPicker')
        expect(result.scheduleInputMode).toBe('text')
    })

    it('does not synthesize defaults for hidden fields', () => {
        const params = buildParams()
        const result = applyVisibleFieldDefaults(params, { startInputType: 'scheduleInput' })

        expect(result).not.toHaveProperty('formTitle')
    })

    it('does not synthesize defaults for fields without a `default`', () => {
        const params = buildParams()
        const result = applyVisibleFieldDefaults(params, { startInputType: 'scheduleInput' })

        expect(result).not.toHaveProperty('scheduleFrequency')
    })

    it('preserves existing values, including falsy ones (empty string, false, 0)', () => {
        const params: InputParam[] = [
            makeParam({ name: 'a', default: 'fallback' }),
            makeParam({ name: 'b', default: 'fallback' }),
            makeParam({ name: 'c', default: 'fallback' }),
            makeParam({ name: 'd', default: 'fallback' })
        ]
        const result = applyVisibleFieldDefaults(params, { a: '', b: false, c: 0, d: null })

        expect(result.a).toBe('')
        expect(result.b).toBe(false)
        expect(result.c).toBe(0)
        expect(result.d).toBeNull()
    })

    it('does not mutate the input map', () => {
        const params = buildParams()
        const inputs = { startInputType: 'scheduleInput' }
        const inputsBefore = { ...inputs }
        applyVisibleFieldDefaults(params, inputs)
        expect(inputs).toEqual(inputsBefore)
    })
})
