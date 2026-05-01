import { getMimeType, isTextMimeType, paginateLines, escapeRegex, globToRegex, formatWithLineNumbers } from './utils'

describe('getMimeType', () => {
    it('returns correct type for TypeScript', () => {
        expect(getMimeType('foo.ts')).toBe('text/typescript')
    })
    it('returns correct type for PNG', () => {
        expect(getMimeType('image.png')).toBe('image/png')
    })
    it('returns correct type for PDF', () => {
        expect(getMimeType('doc.pdf')).toBe('application/pdf')
    })
    it('returns octet-stream for unknown extension', () => {
        expect(getMimeType('file.xyz')).toBe('application/octet-stream')
    })
    it('handles paths with directories', () => {
        expect(getMimeType('/workspace/src/index.ts')).toBe('text/typescript')
    })
})

describe('isTextMimeType', () => {
    it('returns true for text/plain', () => expect(isTextMimeType('text/plain')).toBe(true))
    it('returns true for text/typescript', () => expect(isTextMimeType('text/typescript')).toBe(true))
    it('returns true for application/json', () => expect(isTextMimeType('application/json')).toBe(true))
    it('returns false for image/png', () => expect(isTextMimeType('image/png')).toBe(false))
    it('returns false for application/pdf', () => expect(isTextMimeType('application/pdf')).toBe(false))
    it('returns false for application/octet-stream', () => expect(isTextMimeType('application/octet-stream')).toBe(false))
})

describe('paginateLines', () => {
    const text = 'line1\nline2\nline3\nline4\nline5'
    it('returns first N lines from offset 0', () => {
        expect(paginateLines(text, 0, 3)).toEqual({ content: 'line1\nline2\nline3', truncated: true })
    })
    it('returns slice from non-zero offset', () => {
        expect(paginateLines(text, 2, 2)).toEqual({ content: 'line3\nline4', truncated: true })
    })
    it('returns remaining lines if limit exceeds length', () => {
        expect(paginateLines(text, 4, 100)).toEqual({ content: 'line5', truncated: false })
    })
    it('sets truncated false when all lines fit', () => {
        expect(paginateLines(text, 0, 100)).toEqual({ content: text, truncated: false })
    })
})

describe('escapeRegex', () => {
    it('escapes special regex characters', () => {
        expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c')
    })
})

describe('globToRegex', () => {
    it('matches ** across directories', () => {
        const rx = globToRegex('**/*.ts')
        expect(rx.test('src/foo.ts')).toBe(true)
        expect(rx.test('src/deep/bar.ts')).toBe(true)
        expect(rx.test('src/foo.js')).toBe(false)
    })
    it('matches * within single directory segment', () => {
        const rx = globToRegex('src/*.ts')
        expect(rx.test('src/foo.ts')).toBe(true)
        expect(rx.test('src/deep/foo.ts')).toBe(false)
    })
    it('matches ? for single character', () => {
        const rx = globToRegex('fo?.ts')
        expect(rx.test('foo.ts')).toBe(true)
        expect(rx.test('fo.ts')).toBe(false)
    })
    it('escapes dots in literal patterns', () => {
        const rx = globToRegex('file.txt')
        expect(rx.test('file.txt')).toBe(true)
        expect(rx.test('filextxt')).toBe(false)
    })
})

describe('formatWithLineNumbers', () => {
    it('prefixes each line with a 1-indexed tab-separated line number', () => {
        expect(formatWithLineNumbers('hello\nworld', 0)).toBe('1\thello\n2\tworld')
    })
    it('respects the startLine offset', () => {
        expect(formatWithLineNumbers('foo', 9)).toBe('10\tfoo')
    })
})
