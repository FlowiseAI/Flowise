import {
    decodeFileContent,
    escapeRegex,
    formatWithLineNumbers,
    getMimeType,
    globToRegex,
    isTextMimeType,
    MAX_BINARY_READ_SIZE_BYTES,
    normalizeContent,
    paginateLines,
    toMultimodalContentBlock
} from './utils'

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

describe('toMultimodalContentBlock', () => {
    it('returns image block for image/* mime', () => {
        const block = toMultimodalContentBlock(new Uint8Array([137, 80, 78, 71]), 'image/png')
        expect(block.type).toBe('image')
        expect(block.mimeType).toBe('image/png')
        expect(block.data).toBe(Buffer.from([137, 80, 78, 71]).toString('base64'))
    })

    it('returns audio block for audio/* mime', () => {
        const block = toMultimodalContentBlock(new Uint8Array([1, 2, 3]), 'audio/mpeg')
        expect(block.type).toBe('audio')
        expect(block.mimeType).toBe('audio/mpeg')
    })

    it('returns video block for video/* mime', () => {
        const block = toMultimodalContentBlock(new Uint8Array([4, 5, 6]), 'video/mp4')
        expect(block.type).toBe('video')
    })

    it('returns generic file block for non-image/audio/video mime', () => {
        const block = toMultimodalContentBlock(new Uint8Array([0]), 'application/wasm')
        expect(block.type).toBe('file')
        expect(block.mimeType).toBe('application/wasm')
    })

    it('returns generic file block for application/octet-stream', () => {
        const block = toMultimodalContentBlock(new Uint8Array([0]), 'application/octet-stream')
        expect(block.type).toBe('file')
    })
})

describe('decodeFileContent', () => {
    it('returns text content as-is for text mime', () => {
        expect(decodeFileContent('hello', 'text/plain')).toBe('hello')
    })

    it('base64-decodes binary content for binary mime', () => {
        const b64 = Buffer.from([137, 80, 78, 71]).toString('base64')
        const result = decodeFileContent(b64, 'image/png')
        expect(result).toBeInstanceOf(Uint8Array)
        expect(Array.from(result as Uint8Array)).toEqual([137, 80, 78, 71])
    })

    it('round-trips bytes through base64 for arbitrary binary content', () => {
        const original = new Uint8Array([0, 1, 2, 254, 255, 13, 10, 26])
        const b64 = Buffer.from(original).toString('base64')
        const decoded = decodeFileContent(b64, 'application/octet-stream') as Uint8Array
        expect(Array.from(decoded)).toEqual(Array.from(original))
    })
})

describe('normalizeContent', () => {
    it('returns base64 string for binary mime + Uint8Array input', () => {
        const result = normalizeContent(new Uint8Array([137, 80, 78, 71]), 'image/png')
        expect(typeof result).toBe('string')
        expect(result).toBe(Buffer.from([137, 80, 78, 71]).toString('base64'))
    })

    it('passes through string for binary mime + string input (assumes base64)', () => {
        const b64 = 'aGVsbG8='
        expect(normalizeContent(b64, 'image/png')).toBe(b64)
    })

    it('returns utf-8 string for text mime + string input', () => {
        expect(normalizeContent('hello', 'text/plain')).toBe('hello')
    })

    it('decodes Uint8Array for text mime + Uint8Array input', () => {
        const bytes = new TextEncoder().encode('hi')
        expect(normalizeContent(bytes, 'text/plain')).toBe('hi')
    })
})

describe('MAX_BINARY_READ_SIZE_BYTES', () => {
    it('is 5 MB', () => {
        expect(MAX_BINARY_READ_SIZE_BYTES).toBe(5 * 1024 * 1024)
    })
})
