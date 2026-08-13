import { escapeSpecialChars, unEscapeSpecialChars } from './utils'

// escapeSpecialChars

describe('escapeSpecialChars', () => {
    test('escapes hyphen (original behaviour preserved)', () => {
        expect(escapeSpecialChars('hello-world')).toBe('hello\\-world')
    })

    test('escapes colon — the primary bug trigger', () => {
        expect(escapeSpecialChars('source:file.pdf')).toBe('source\\:file\\.pdf')
    })

    test('escapes double-quote — the primary bug trigger', () => {
        expect(escapeSpecialChars('"quoted"')).toBe('\\"quoted\\"')
    })

    test('escapes all other RediSearch special chars', () => {
        const chars = [
            ',',
            '.',
            '<',
            '>',
            '{',
            '}',
            '[',
            ']',
            "'",
            ';',
            '!',
            '@',
            '#',
            '$',
            '%',
            '^',
            '&',
            '*',
            '(',
            ')',
            '+',
            '=',
            '~',
            '\\'
        ]
        for (const ch of chars) {
            expect(escapeSpecialChars(ch)).toBe(`\\${ch}`)
        }
    })

    test('leaves normal alphanumeric strings untouched', () => {
        expect(escapeSpecialChars('hello world 123')).toBe('hello world 123')
    })

    test('handles empty string', () => {
        expect(escapeSpecialChars('')).toBe('')
    })
})

// unEscapeSpecialChars

describe('unEscapeSpecialChars', () => {
    test('unescapes hyphen (original behaviour preserved)', () => {
        expect(unEscapeSpecialChars('hello\\-world')).toBe('hello-world')
    })

    test('unescapes colon — the primary bug trigger', () => {
        expect(unEscapeSpecialChars('source\\:file\\.pdf')).toBe('source:file.pdf')
    })

    test('unescapes double-quote — the primary bug trigger', () => {
        expect(unEscapeSpecialChars('\\"quoted\\"')).toBe('"quoted"')
    })

    test('unescapes all other RediSearch special chars', () => {
        const chars = [
            ',',
            '.',
            '<',
            '>',
            '{',
            '}',
            '[',
            ']',
            "'",
            ';',
            '!',
            '@',
            '#',
            '$',
            '%',
            '^',
            '&',
            '*',
            '(',
            ')',
            '+',
            '=',
            '~',
            '\\'
        ]
        for (const ch of chars) {
            expect(unEscapeSpecialChars(`\\${ch}`)).toBe(ch)
        }
    })

    test('handles empty string', () => {
        expect(unEscapeSpecialChars('')).toBe('')
    })
})

// Round-trip: the core regression test
//
// Simulates the EXACT production flow:
//   STORAGE — @langchain/redis vectorstores.cjs line 123:
//     hashFields[metadataKey] = this.escapeSpecialChars(JSON.stringify(metadata))
//   where the library's own escapeSpecialChars (line 415-416) escapes ONLY
//   '-', ':', and '"' — applied to the entire JSON string.
//
//   RETRIEVAL — Redis.ts (Flowise override) line 349:
//     const metadataString = unEscapeSpecialChars(document[metadataKey])
//     metadata: JSON.parse(metadataString)
//
// The OLD bug: only '\-' was removed, leaving '\"' and '\:' in the JSON,
// causing JSON.parse to throw "Expected property name or '}'".
// The FIX: unEscapeSpecialChars now removes all library-applied escapes so
// the string is valid JSON before JSON.parse is called.

describe('escape / unescape round-trip (regression for GitHub bug)', () => {
    /**
     * Mirrors @langchain/redis vectorstores.cjs line 123:
     *   this.escapeSpecialChars(JSON.stringify(metadata))
     * The library escapes only '-', ':', '"' on the full JSON string.
     */
    function simulateUpsert(metadata: object): string {
        const jsonStr = JSON.stringify(metadata)
        // Same order as the library (vectorstores.cjs line 415-416):
        return jsonStr.replaceAll('-', '\\-').replaceAll(':', '\\:').replaceAll('"', '\\"')
    }

    /**
     * Mirrors Redis.ts line 349 (Flowise's override of similaritySearchVectorWithScore):
     *   unEscapeSpecialChars(rawString) → JSON.parse
     * NOTE: unescape happens BEFORE parse — that is the exact production order.
     */
    function simulateRetrieval(stored: string): object {
        const unescaped = unEscapeSpecialChars(stored)
        return JSON.parse(unescaped)
    }

    test('round-trips metadata containing a colon in a value', () => {
        const original = { source: 'gs://my-bucket:path/to/file.pdf', page: 1 }
        const stored = simulateUpsert(original)
        const retrieved = simulateRetrieval(stored)
        expect(retrieved).toEqual(original)
    })

    test('round-trips metadata containing double-quotes in a value', () => {
        const original = { title: '"Hello World"', page: 2 }
        const stored = simulateUpsert(original)
        const retrieved = simulateRetrieval(stored)
        expect(retrieved).toEqual(original)
    })

    test('round-trips metadata containing a mix of special chars', () => {
        const original = {
            source: 'file-name (v2).pdf',
            author: "O'Brien, J.",
            tag: '#important & <urgent>',
            page: 3
        }
        const stored = simulateUpsert(original)
        const retrieved = simulateRetrieval(stored)
        expect(retrieved).toEqual(original)
    })

    test('round-trips plain metadata with no special chars (sanity check)', () => {
        const original = { source: 'simple_file.pdf', page: 4 }
        const stored = simulateUpsert(original)
        const retrieved = simulateRetrieval(stored)
        expect(retrieved).toEqual(original)
    })
})
