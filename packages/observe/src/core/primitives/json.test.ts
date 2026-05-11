import { tokenizeJson, tryParseJson } from './json'

describe('tryParseJson', () => {
    it('returns ok=true for objects, arrays, primitives, and null', () => {
        expect(tryParseJson('{"k":1}')).toEqual({ ok: true, value: { k: 1 } })
        expect(tryParseJson('[1,2,3]')).toEqual({ ok: true, value: [1, 2, 3] })
        expect(tryParseJson('42')).toEqual({ ok: true, value: 42 })
        expect(tryParseJson('"hi"')).toEqual({ ok: true, value: 'hi' })
        expect(tryParseJson('true')).toEqual({ ok: true, value: true })
        expect(tryParseJson('null')).toEqual({ ok: true, value: null })
    })

    it('returns ok=false for unparseable strings', () => {
        expect(tryParseJson('hello')).toEqual({ ok: false })
        expect(tryParseJson('{not-json}')).toEqual({ ok: false })
    })

    it('returns ok=false for empty / whitespace-only strings', () => {
        // JSON.parse('') is undefined and JSON.parse('  ') throws — both must
        // collapse to a clean ok=false rather than leaking inconsistent shapes.
        expect(tryParseJson('')).toEqual({ ok: false })
        expect(tryParseJson('   ')).toEqual({ ok: false })
    })
})

describe('tokenizeJson', () => {
    it('classifies keys, strings, numbers, booleans, and null', () => {
        const json = JSON.stringify({ k: 'v', n: 1, b: true, z: null }, null, 2)
        const tokens = tokenizeJson(json)
        const byType = (type: string) => tokens.filter((t) => t.type === type).map((t) => t.text)
        expect(byType('key')).toEqual(['"k":', '"n":', '"b":', '"z":'])
        expect(byType('string')).toEqual(['"v"'])
        expect(byType('number')).toEqual(['1'])
        expect(byType('boolean')).toEqual(['true'])
        expect(byType('null')).toEqual(['null'])
    })

    it('preserves whitespace and structural characters as punctuation tokens', () => {
        const tokens = tokenizeJson('[1, 2]')
        const reassembled = tokens.map((t) => t.text).join('')
        expect(reassembled).toBe('[1, 2]')
        // Brackets, comma, and spaces are punctuation — only the digits are numbers.
        expect(tokens.filter((t) => t.type === 'number').map((t) => t.text)).toEqual(['1', '2'])
    })

    it('handles negative numbers, decimals, and exponents', () => {
        const tokens = tokenizeJson('[-1, 2.5, 1e3, -1.5e-2]')
        expect(tokens.filter((t) => t.type === 'number').map((t) => t.text)).toEqual(['-1', '2.5', '1e3', '-1.5e-2'])
    })

    it('classifies a string with a colon-suffix as a key, not a string', () => {
        // The regex peeks for `\s*:` after the closing quote — anchors object-key detection.
        const tokens = tokenizeJson('{"k":"v"}')
        expect(tokens.find((t) => t.text === '"k":')?.type).toBe('key')
        expect(tokens.find((t) => t.text === '"v"')?.type).toBe('string')
    })

    it('emits an empty array for an empty input', () => {
        expect(tokenizeJson('')).toEqual([])
    })

    it('round-trips: token texts concatenated equal the original input', () => {
        const json = JSON.stringify({ a: [1, true, null, 'x'], b: { nested: 0.5 } }, null, 2)
        const tokens = tokenizeJson(json)
        expect(tokens.map((t) => t.text).join('')).toBe(json)
    })
})
