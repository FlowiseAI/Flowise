import { validateMimeTypeAndExtensionMatch } from './validator'

describe('validateMimeTypeAndExtensionMatch', () => {
    describe('valid cases', () => {
        it.each([
            ['document.txt', 'text/plain'],
            ['page.html', 'text/html'],
            ['data.json', 'application/json'],
            ['document.pdf', 'application/pdf'],
            ['script.js', 'text/javascript'],
            ['script.js', 'application/javascript'],
            ['readme.md', 'text/markdown'],
            ['readme.md', 'text/x-markdown'],
            ['DOCUMENT.TXT', 'text/plain'],
            ['Document.TxT', 'text/plain'],
            ['my.document.txt', 'text/plain']
        ])('should pass validation for matching MIME type and extension - %s with %s', (filename, mimetype) => {
            expect(() => {
                validateMimeTypeAndExtensionMatch(filename, mimetype)
            }).not.toThrow()
        })
    })

    describe('invalid filename', () => {
        it.each([
            ['empty filename', ''],
            ['null filename', null],
            ['undefined filename', undefined],
            ['non-string filename (number)', 123],
            ['object filename', {}]
        ])('should throw error for %s', (_description, filename) => {
            expect(() => {
                validateMimeTypeAndExtensionMatch(filename as any, 'text/plain')
            }).toThrow('Invalid filename: filename is required and must be a string')
        })
    })

    describe('invalid MIME type', () => {
        it.each([
            ['empty MIME type', ''],
            ['null MIME type', null],
            ['undefined MIME type', undefined],
            ['non-string MIME type (number)', 123]
        ])('should throw error for %s', (_description, mimetype) => {
            expect(() => {
                validateMimeTypeAndExtensionMatch('file.txt', mimetype as any)
            }).toThrow('Invalid MIME type: MIME type is required and must be a string')
        })
    })

    describe('path traversal detection', () => {
        it.each([
            ['filename with ..', '../file.txt'],
            ['filename with .. in middle', 'path/../file.txt'],
            ['filename with multle levels of ..', '../../../etc/passwd.txt'],
            ['filename with  ..\\..\\..', '..\\..\\..\\windows\\system32\\file.txt'],
            ['filename with ....//....//', '....//....//etc/passwd.txt'],
            ['filename starting with /', '/etc/passwd.txt'],
            ['Windows absolute path', 'C:\\file.txt'],
            ['URL encoded path traversal', '%2e%2e/file.txt'],
            ['URL encoded path traversal multiple levels', '%2e%2e%2f%2e%2e%2f%2e%2e%2ffile.txt'],
            ['null byte', 'file\0.txt']
        ])('should throw error for %s', (_description, filename) => {
            expect(() => {
                validateMimeTypeAndExtensionMatch(filename, 'text/plain')
            }).toThrow(`Invalid filename: path traversal detected in filename "${filename}"`)
        })
    })

    describe('files without extensions', () => {
        it.each([
            ['filename without extension', 'file'],
            ['filename ending with dot', 'file.']
        ])('should throw error for %s', (_description, filename) => {
            expect(() => {
                validateMimeTypeAndExtensionMatch(filename, 'text/plain')
            }).toThrow('File type not allowed: files must have a valid file extension')
        })
    })

    describe('unsupported MIME types', () => {
        it.each([
            ['application/octet-stream', 'file.txt'],
            ['invalid-mime-type', 'file.txt'],
            ['application/x-msdownload', 'malware.exe'],
            ['application/x-executable', 'script.exe'],
            ['application/x-msdownload', 'program.EXE'],
            ['application/octet-stream', 'script.js']
        ])('should throw error for unsupported MIME type %s with %s', (mimetype, filename) => {
            expect(() => {
                validateMimeTypeAndExtensionMatch(filename, mimetype)
            }).toThrow(`MIME type "${mimetype}" is not supported or does not have a valid file extension mapping`)
        })
    })

    describe('MIME type and extension mismatches', () => {
        it.each([
            // [filename, mimetype, actualExt, expectedExt]
            ['file.txt', 'application/json', 'txt', 'json'],
            ['script.js', 'application/pdf', 'js', 'pdf'],
            ['page.html', 'text/plain', 'html', 'txt'],
            ['document.pdf', 'application/json', 'pdf', 'json'],
            ['data.json', 'text/plain', 'json', 'txt'],
            ['malware.exe', 'text/plain', 'exe', 'txt'],
            ['script.js', 'application/json', 'js', 'json']
        ])('should throw error when extension does not match MIME type - %s with %s', (filename, mimetype, actualExt, expectedExt) => {
            expect(() => {
                validateMimeTypeAndExtensionMatch(filename, mimetype)
            }).toThrow(
                `MIME type mismatch: file extension "${actualExt}" does not match declared MIME type "${mimetype}". Expected: ${expectedExt}`
            )
        })
    })
})
