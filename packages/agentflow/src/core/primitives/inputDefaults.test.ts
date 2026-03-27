import { getDefaultValueForType } from './inputDefaults'

describe('getDefaultValueForType', () => {
    it('returns default when defined', () => {
        expect(getDefaultValueForType({ type: 'string', default: 'custom' })).toBe('custom')
    })

    it('returns default even when it is a falsy value', () => {
        expect(getDefaultValueForType({ type: 'number', default: 0 })).toBe(0)
        expect(getDefaultValueForType({ type: 'boolean', default: false })).toBe(false)
        expect(getDefaultValueForType({ type: 'string', default: '' })).toBe('')
    })

    it('returns false for boolean', () => {
        expect(getDefaultValueForType({ type: 'boolean' })).toBe(false)
    })

    it('returns 0 for number', () => {
        expect(getDefaultValueForType({ type: 'number' })).toBe(0)
    })

    it("returns '{}' for json", () => {
        expect(getDefaultValueForType({ type: 'json' })).toBe('{}')
    })

    it('returns [] for array', () => {
        expect(getDefaultValueForType({ type: 'array' })).toEqual([])
    })

    it('returns first option name for object options', () => {
        expect(
            getDefaultValueForType({
                type: 'options',
                options: [{ name: 'first' }, { name: 'second' }]
            })
        ).toBe('first')
    })

    it('returns first option value for string options', () => {
        expect(getDefaultValueForType({ type: 'options', options: ['alpha', 'beta'] })).toBe('alpha')
    })

    it("returns '' for options with no options", () => {
        expect(getDefaultValueForType({ type: 'options' })).toBe('')
        expect(getDefaultValueForType({ type: 'options', options: [] })).toBe('')
    })

    it("returns '' for string", () => {
        expect(getDefaultValueForType({ type: 'string' })).toBe('')
    })

    it("returns '' for password", () => {
        expect(getDefaultValueForType({ type: 'password' })).toBe('')
    })

    it("returns '' for unknown type", () => {
        expect(getDefaultValueForType({ type: 'somethingElse' })).toBe('')
    })
})
