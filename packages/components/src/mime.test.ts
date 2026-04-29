import { getMimeType, isTextMimeType, mapMimeTypeToExt, EXT_TO_MIME } from './mime'

describe('getMimeType', () => {
    it('returns correct MIME for a standard extension', () => {
        expect(getMimeType('file.ts')).toBe('text/typescript')
        expect(getMimeType('file.pdf')).toBe('application/pdf')
        expect(getMimeType('file.mp3')).toBe('audio/mpeg')
        expect(getMimeType('file.webm')).toBe('video/webm')
    })

    it('is case-insensitive', () => {
        expect(getMimeType('file.PDF')).toBe('application/pdf')
        expect(getMimeType('file.PNG')).toBe('image/png')
    })

    it('handles dotfiles (.env, .log)', () => {
        expect(getMimeType('.env')).toBe('text/plain')
        expect(getMimeType('.log')).toBe('text/plain')
    })

    it('uses the last extension for multi-dot filenames', () => {
        expect(getMimeType('my.config.json')).toBe('application/json')
    })

    it('falls back to application/octet-stream for unknown extensions', () => {
        expect(getMimeType('file.unknown')).toBe('application/octet-stream')
        expect(getMimeType('noextension')).toBe('application/octet-stream')
    })
})

describe('isTextMimeType', () => {
    it('returns true for text/* types', () => {
        expect(isTextMimeType('text/plain')).toBe(true)
        expect(isTextMimeType('text/html')).toBe(true)
        expect(isTextMimeType('text/typescript')).toBe(true)
    })

    it('returns true for text-like application/* types', () => {
        expect(isTextMimeType('application/json')).toBe(true)
        expect(isTextMimeType('application/xml')).toBe(true)
        expect(isTextMimeType('application/yaml')).toBe(true)
        expect(isTextMimeType('application/sql')).toBe(true)
    })

    it('returns false for binary types', () => {
        expect(isTextMimeType('image/png')).toBe(false)
        expect(isTextMimeType('audio/mpeg')).toBe(false)
        expect(isTextMimeType('application/pdf')).toBe(false)
        expect(isTextMimeType('application/zip')).toBe(false)
    })
})

describe('mapMimeTypeToExt', () => {
    it('returns canonical extension for primary MIME types', () => {
        expect(mapMimeTypeToExt('application/pdf')).toBe('pdf')
        expect(mapMimeTypeToExt('text/plain')).toBe('txt')
        expect(mapMimeTypeToExt('application/json')).toBe('json')
        expect(mapMimeTypeToExt('text/csv')).toBe('csv')
        expect(mapMimeTypeToExt('text/html')).toBe('html')
        expect(mapMimeTypeToExt('audio/mpeg')).toBe('mp3')
        expect(mapMimeTypeToExt('video/mp4')).toBe('mp4')
    })

    it('resolves MIME aliases', () => {
        expect(mapMimeTypeToExt('text/x-yaml')).toBe('yaml')
        expect(mapMimeTypeToExt('application/x-yaml')).toBe('yaml')
        expect(mapMimeTypeToExt('text/x-markdown')).toBe('md')
        expect(mapMimeTypeToExt('application/javascript')).toBe('js')
        expect(mapMimeTypeToExt('audio/mp3')).toBe('mp3')
        expect(mapMimeTypeToExt('audio/webm')).toBe('webm')
        expect(mapMimeTypeToExt('application/json-lines')).toBe('jsonl')
        expect(mapMimeTypeToExt('application/jsonl')).toBe('jsonl')
    })

    it('handles Office document MIME types', () => {
        expect(mapMimeTypeToExt('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx')
        expect(mapMimeTypeToExt('application/msword')).toBe('doc')
        expect(mapMimeTypeToExt('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xlsx')
        expect(mapMimeTypeToExt('application/vnd.ms-excel')).toBe('xls')
        expect(mapMimeTypeToExt('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe('pptx')
    })

    it('returns empty string for unknown MIME types', () => {
        expect(mapMimeTypeToExt('application/x-unknown')).toBe('')
    })
})

describe('EXT_TO_MIME first-listed-wins inversion', () => {
    it('.js wins over .jsx for text/javascript', () => {
        expect(mapMimeTypeToExt('text/javascript')).toBe('js')
    })

    it('.ts wins over .tsx for text/typescript', () => {
        expect(mapMimeTypeToExt('text/typescript')).toBe('ts')
    })

    it('.html wins over .htm for text/html', () => {
        expect(mapMimeTypeToExt('text/html')).toBe('html')
    })

    it('.yaml wins over .yml for application/yaml', () => {
        expect(mapMimeTypeToExt('application/yaml')).toBe('yaml')
    })
})

describe('EXT_TO_MIME completeness', () => {
    it('has no empty keys or values', () => {
        for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
            expect(ext.length).toBeGreaterThan(1) // at least dot + one char
            expect(mime.length).toBeGreaterThan(0)
        }
    })

    it('all keys start with a dot', () => {
        for (const ext of Object.keys(EXT_TO_MIME)) {
            expect(ext.startsWith('.')).toBe(true)
        }
    })
})
