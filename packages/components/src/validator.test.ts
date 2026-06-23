import {
    getSafeFilePath,
    isPathTraversal,
    isUnsafeFilePath,
    isValidURL,
    validateMimeTypeAndExtensionMatch,
    validateVectorStorePath,
    validateSQLitePath
} from './validator'
import path from 'path'
import { getUserHome } from './utils'
import * as utils from './utils'

describe('isPathTraversal', () => {
    describe('returns true for dangerous patterns', () => {
        it.each([
            ['directory traversal (..)', '../etc/passwd'],
            ['multiple levels of traversal', '../../sensitive'],
            ['bare double-dot', '..'],
            ['Windows absolute path', 'C:\\windows'],
            ['Windows absolute path with forward slash', 'C:/windows'],
            ['Windows absolute path with leading whitespace', ' C:\\windows'],
            ['UNC path', '\\\\server\\share'],
            ['URL encoded dot (%2e)', '%2e%2e/etc'],
            ['URL encoded dot uppercase (%2E)', '%2E%2E'],
            ['mixed encoding (.%2e)', '.%2e/etc'],
            ['mixed encoding (%2e.)', '%2e./etc'],
            ['URL encoded forward slash (%2f)', '%2f'],
            ['URL encoded forward slash uppercase (%2F)', '%2F'],
            ['URL encoded backslash (%5c)', '%5c'],
            ['URL encoded backslash uppercase (%5C)', '%5C'],
            ['null byte', 'path\0name'],
            ['URL encoded null byte (%00)', 'path%00name'],
            ['absolute Unix path', '/etc/passwd'],
            ['absolute Unix root', '/']
        ])('should detect %s: %s', (_description, input) => {
            expect(isPathTraversal(input)).toBe(true)
        })
    })

    describe('returns false for safe inputs', () => {
        it.each([
            ['simple filename with extension', 'filename.txt'],
            ['plain name without extension', 'myfile'],
            ['empty string', ''],
            ['name with underscores', 'hello_world'],
            ['relative path with slash', 'uploads/file.txt']
        ])('should not flag %s: %s', (_description, input) => {
            expect(isPathTraversal(input)).toBe(false)
        })
    })

    describe('PATH_TRAVERSAL_SAFETY=false bypasses all checks', () => {
        beforeEach(() => {
            process.env.PATH_TRAVERSAL_SAFETY = 'false'
        })
        afterEach(() => {
            delete process.env.PATH_TRAVERSAL_SAFETY
        })

        it.each([
            ['absolute Unix path', '/data/uploads'],
            ['mixed encoding', '.%2e/etc'],
            ['directory traversal', '../etc/passwd'],
            ['Windows absolute path', 'C:\\windows']
        ])('should return false for %s when safety disabled', (_desc, input) => {
            expect(isPathTraversal(input)).toBe(false)
        })
    })
})

describe('isUnsafeFilePath', () => {
    describe('PATH_TRAVERSAL_SAFETY=false bypasses all checks', () => {
        beforeEach(() => {
            process.env.PATH_TRAVERSAL_SAFETY = 'false'
        })
        afterEach(() => {
            delete process.env.PATH_TRAVERSAL_SAFETY
        })

        it.each([
            ['absolute Unix path', '/data/uploads'],
            ['directory traversal', '../etc/passwd'],
            ['Windows absolute path', 'C:\\windows'],
            ['null byte', 'path\0name'],
            ['control character', 'path\x01name']
        ])('should return false for %s when safety disabled', (_desc, input) => {
            expect(isUnsafeFilePath(input)).toBe(false)
        })
    })
})

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
            ['my.document.txt', 'text/plain'],
            // Image types
            ['photo.jpg', 'image/jpeg'],
            ['photo.jpeg', 'image/jpeg'], // .jpeg should be normalized to .jpg
            ['PHOTO.JPEG', 'image/jpeg'], // Case insensitive and normalization
            ['image.png', 'image/png'],
            ['animation.gif', 'image/gif'],
            ['picture.webp', 'image/webp'],
            ['icon.svg', 'image/svg+xml'],
            ['IMAGE.PNG', 'image/png'],
            // Audio types
            ['audio.webm', 'audio/webm'],
            ['sound.m4a', 'audio/mp4'],
            ['sound.m4a', 'audio/x-m4a'],
            ['music.mp3', 'audio/mpeg'],
            ['music.mp3', 'audio/mp3'],
            ['audio.ogg', 'audio/ogg'],
            ['audio.oga', 'audio/ogg'], // .oga should normalize to ogg
            ['audio.oga', 'audio/oga'],
            ['sound.wav', 'audio/wav'],
            ['sound.wav', 'audio/wave'],
            ['sound.wav', 'audio/x-wav'],
            ['audio.aac', 'audio/aac'],
            ['audio.flac', 'audio/flac'],
            // Video types
            ['video.mp4', 'video/mp4'],
            ['video.webm', 'video/webm'],
            ['movie.mov', 'video/quicktime'],
            ['clip.avi', 'video/x-msvideo'],
            // YAML types
            ['config.yaml', 'application/vnd.yaml'],
            ['config.yaml', 'application/x-yaml'],
            ['config.yaml', 'text/vnd.yaml'],
            ['config.yaml', 'text/x-yaml'],
            ['config.yaml', 'text/yaml'],
            // SQL types
            ['query.sql', 'application/sql'],
            ['query.sql', 'text/x-sql'],
            // Document types
            ['document.rtf', 'application/rtf'],
            // Additional image types
            ['image.tiff', 'image/tiff'],
            ['image.tif', 'image/tiff'], // .tif should normalize to tiff
            ['image.tif', 'image/tif'],
            ['icon.ico', 'image/x-icon'],
            ['icon.ico', 'image/vnd.microsoft.icon'],
            ['photo.avif', 'image/avif']
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
                validateMimeTypeAndExtensionMatch(filename as unknown as string, 'text/plain')
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
                validateMimeTypeAndExtensionMatch('file.txt', mimetype as unknown as string)
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
            }).toThrow(`Invalid filename: unsafe characters or path traversal attempt detected in filename "${filename}"`)
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
            ['script.js', 'application/json', 'js', 'json'],
            // Image/audio mismatches
            ['photo.jpg', 'image/png', 'jpg', 'png'],
            ['image.png', 'image/jpeg', 'png', 'jpg'],
            ['audio.mp3', 'audio/wav', 'mp3', 'wav'],
            ['sound.wav', 'audio/mpeg', 'wav', 'mp3'],
            // New type mismatches
            ['config.yaml', 'application/json', 'yaml', 'json'],
            ['query.sql', 'text/plain', 'sql', 'txt'],
            ['document.rtf', 'application/pdf', 'rtf', 'pdf'],
            ['video.mp4', 'video/webm', 'mp4', 'webm'],
            ['image.tiff', 'image/png', 'tiff', 'png'],
            ['icon.ico', 'image/png', 'ico', 'png']
        ])('should throw error when extension does not match MIME type - %s with %s', (filename, mimetype, actualExt, expectedExt) => {
            expect(() => {
                validateMimeTypeAndExtensionMatch(filename, mimetype)
            }).toThrow(
                `MIME type mismatch: file extension "${actualExt}" does not match declared MIME type "${mimetype}". Expected: ${expectedExt}`
            )
        })
    })
})

describe('validateVectorStorePath', () => {
    const userHome = getUserHome()
    const defaultFlowisePath = path.join(userHome, '.flowise')

    describe('valid paths', () => {
        it('should return default path when no path is provided', () => {
            const result = validateVectorStorePath(undefined)
            expect(result).toBe(path.join(userHome, '.flowise', 'vectorstore'))
        })

        it('should return default path when empty string is provided', () => {
            const result = validateVectorStorePath('')
            expect(result).toBe(path.join(userHome, '.flowise', 'vectorstore'))
        })

        it('should return default path when whitespace string is provided', () => {
            const result = validateVectorStorePath('   ')
            expect(result).toBe(path.join(userHome, '.flowise', 'vectorstore'))
        })

        it('should accept relative path within .flowise directory', () => {
            const relativePath = 'vectorstore/faiss'
            const result = validateVectorStorePath(relativePath)

            // Should resolve to absolute path within .flowise
            expect(path.isAbsolute(result)).toBe(true)
            expect(result).toContain('.flowise')
        })

        it('should accept absolute path within .flowise directory', () => {
            const absolutePath = path.join(defaultFlowisePath, 'vectorstore', 'test')
            const result = validateVectorStorePath(absolutePath)

            expect(result).toBe(absolutePath)
            expect(result.startsWith(defaultFlowisePath)).toBe(true)
        })
    })

    describe('path traversal attacks', () => {
        it.each([
            ['..', 'parent directory reference'],
            ['../etc/passwd', 'path traversal to /etc'],
            ['../../../../../../etc/passwd', 'multiple levels of traversal'],
            ['./../../etc/passwd', 'mixed relative and traversal'],
            ['vectorstore/../../etc/passwd', 'traversal in middle of path'],
            ['..\\..\\..\\windows\\system32', 'Windows path traversal']
        ])('should reject path with path traversal: %s (%s)', (maliciousPath, _description) => {
            expect(() => {
                validateVectorStorePath(maliciousPath)
            }).toThrow('Invalid path: path traversal attempt detected')
        })
    })

    describe('absolute path attacks', () => {
        it.each([
            ['/etc/passwd', 'Unix absolute path'],
            ['/var/www/html', 'Web root path'],
            ['/tmp/../../../etc/passwd', 'Absolute with traversal'],
            ['C:\\Windows\\System32', 'Windows absolute path'],
            ['C:\\Users\\Administrator', 'Windows user path'],
            ['\\\\server\\share', 'UNC path'],
            ['\\\\?\\C:\\Windows', 'Extended-length path']
        ])('should reject absolute path outside allowed directories: %s (%s)', (maliciousPath, _description) => {
            expect(() => {
                validateVectorStorePath(maliciousPath)
            }).toThrow(/Invalid path:/)
        })
    })

    describe('encoded path traversal', () => {
        it.each([
            ['%2e%2e/etc/passwd', 'URL encoded ..'],
            ['%2e%2e%2f%2e%2e%2fetc', 'Multiple URL encoded ..'],
            ['%2f%2e%2e%2f%2e%2e', 'URL encoded /..'],
            ['%5c%2e%2e%5c%2e%2e', 'URL encoded Windows traversal']
        ])('should reject encoded path traversal: %s (%s)', (encodedPath, _description) => {
            expect(() => {
                validateVectorStorePath(encodedPath)
            }).toThrow(/Invalid path:/)
        })
    })

    describe('special characters and control characters', () => {
        it('should reject path with null bytes', () => {
            const pathWithNull = 'vectorstore\0malicious'
            expect(() => {
                validateVectorStorePath(pathWithNull)
            }).toThrow(/Invalid path:/)
        })

        it('should reject path with control characters', () => {
            const pathWithControl = 'vectorstore\x00\x01\x02'
            expect(() => {
                validateVectorStorePath(pathWithControl)
            }).toThrow(/Invalid path:/)
        })
    })

    describe('paths outside allowed directories', () => {
        it('should reject path to /tmp when BLOB_STORAGE_PATH is not set', () => {
            // Save original env
            const originalEnv = process.env.BLOB_STORAGE_PATH
            delete process.env.BLOB_STORAGE_PATH

            try {
                expect(() => {
                    validateVectorStorePath('/tmp/vectorstore')
                }).toThrow(/Invalid path: path must be within allowed directories/)
            } finally {
                // Restore original env
                if (originalEnv !== undefined) {
                    process.env.BLOB_STORAGE_PATH = originalEnv
                }
            }
        })

        it('should reject path to user home root (outside .flowise)', () => {
            const homeRootPath = path.join(userHome, 'Documents', 'vectorstore')

            expect(() => {
                validateVectorStorePath(homeRootPath)
            }).toThrow(/Invalid path: path must be within allowed directories/)
        })

        it('should reject path to system directories', () => {
            expect(() => {
                validateVectorStorePath('/var/www/html/vectorstore')
            }).toThrow(/Invalid path:/)
        })
    })

    describe('BLOB_STORAGE_PATH environment variable', () => {
        const originalEnv = process.env.BLOB_STORAGE_PATH

        afterEach(() => {
            // Restore original env after each test
            if (originalEnv !== undefined) {
                process.env.BLOB_STORAGE_PATH = originalEnv
            } else {
                delete process.env.BLOB_STORAGE_PATH
            }
        })

        it('should allow path within BLOB_STORAGE_PATH when configured', () => {
            const customStoragePath = path.join(userHome, 'custom-storage')
            process.env.BLOB_STORAGE_PATH = customStoragePath

            const testPath = path.join(customStoragePath, 'vectorstore', 'faiss')
            const result = validateVectorStorePath(testPath)

            expect(result).toBe(testPath)
        })

        it('should allow path within .flowise even when BLOB_STORAGE_PATH is configured', () => {
            process.env.BLOB_STORAGE_PATH = path.join(userHome, 'custom-storage')

            const flowisePath = path.join(defaultFlowisePath, 'vectorstore')
            const result = validateVectorStorePath(flowisePath)

            expect(result).toBe(flowisePath)
        })
    })

    describe('edge cases', () => {
        it('should handle paths with multiple slashes', () => {
            const pathWithMultipleSlashes = path.join(defaultFlowisePath, 'vectorstore', 'test')
            const result = validateVectorStorePath(pathWithMultipleSlashes)

            expect(result).toBe(path.normalize(pathWithMultipleSlashes))
        })

        it('should handle paths with trailing slashes', () => {
            const pathWithTrailingSlash = path.join(defaultFlowisePath, 'vectorstore') + path.sep
            const result = validateVectorStorePath(pathWithTrailingSlash)

            expect(result.startsWith(defaultFlowisePath)).toBe(true)
        })

        it('should normalize path separators', () => {
            // Create a path that might have mixed separators
            const mixedPath = path.join(defaultFlowisePath, 'vectorstore', 'faiss')
            const result = validateVectorStorePath(mixedPath)

            expect(result).toBe(path.normalize(mixedPath))
        })
    })

    describe('PATH_TRAVERSAL_SAFETY=false bypasses all checks', () => {
        beforeEach(() => {
            process.env.PATH_TRAVERSAL_SAFETY = 'false'
        })
        afterEach(() => {
            delete process.env.PATH_TRAVERSAL_SAFETY
        })

        it('should allow arbitrary absolute Unix path', () => {
            expect(validateVectorStorePath('/data/faiss-store')).toBe('/data/faiss-store')
        })

        it('should allow path outside allowed directories (/tmp)', () => {
            expect(validateVectorStorePath('/tmp/mystore')).toBe('/tmp/mystore')
        })

        it('should allow path containing .. without throwing', () => {
            const result = validateVectorStorePath('../mystore')
            expect(typeof result).toBe('string')
        })

        it('should return default path when undefined', () => {
            const userHome = getUserHome()
            expect(validateVectorStorePath(undefined)).toBe(path.join(userHome, '.flowise', 'vectorstore'))
        })
    })
})

describe('validateSQLitePath', () => {
    const userHome = getUserHome()
    const defaultFlowiseDir = path.join(userHome, '.flowise')

    describe('valid paths', () => {
        it('should resolve a simple filename to ~/.flowise/<filename>', () => {
            const result = validateSQLitePath('mydb.sqlite')
            expect(result).toBe(path.join(defaultFlowiseDir, 'mydb.sqlite'))
        })

        it('should resolve a relative subdirectory path within ~/.flowise', () => {
            const result = validateSQLitePath('dbs/mydb.sqlite')
            expect(result).toBe(path.join(defaultFlowiseDir, 'dbs', 'mydb.sqlite'))
        })

        it('should accept an absolute path within ~/.flowise', () => {
            const absolutePath = path.join(defaultFlowiseDir, 'mydb.sqlite')
            const result = validateSQLitePath(absolutePath)
            expect(result).toBe(absolutePath)
        })

        it('should accept an absolute path in a nested directory within ~/.flowise', () => {
            const absolutePath = path.join(defaultFlowiseDir, 'dbs', 'project', 'mydb.sqlite')
            const result = validateSQLitePath(absolutePath)
            expect(result).toBe(absolutePath)
        })

        it('should return an absolute path for any valid input', () => {
            const result = validateSQLitePath('test.db')
            expect(path.isAbsolute(result)).toBe(true)
        })
    })

    describe('empty / missing path', () => {
        it('should throw when path is undefined', () => {
            expect(() => validateSQLitePath(undefined)).toThrow('Invalid SQLite path: database path is required')
        })

        it('should throw when path is empty string', () => {
            expect(() => validateSQLitePath('')).toThrow('Invalid SQLite path: database path is required')
        })

        it('should throw when path is whitespace only', () => {
            expect(() => validateSQLitePath('   ')).toThrow('Invalid SQLite path: database path is required')
        })
    })

    describe('path traversal attacks', () => {
        it.each([
            ['..', 'bare double-dot'],
            ['../etc/passwd', 'path traversal to /etc'],
            ['../../../../../../etc/passwd', 'multiple levels of traversal'],
            ['dbs/../../etc/passwd', 'traversal in middle of path'],
            ['..\\..\\windows\\system32', 'Windows-style traversal']
        ])('should reject %s (%s)', (maliciousPath) => {
            expect(() => validateSQLitePath(maliciousPath)).toThrow('Invalid SQLite path: path traversal attempt detected')
        })
    })

    describe('encoded path traversal', () => {
        it.each([
            ['%2e%2e/etc/passwd', 'URL-encoded ..'],
            ['%2e%2e%2fetc', 'URL-encoded ../etc'],
            ['path%2f%2e%2e%2fetc', 'URL-encoded mid-path traversal'],
            ['path%5c%2e%2e%5cetc', 'URL-encoded Windows traversal']
        ])('should reject %s (%s)', (encodedPath) => {
            expect(() => validateSQLitePath(encodedPath)).toThrow('Invalid SQLite path: encoded path traversal attempt detected')
        })
    })

    describe('control characters and null bytes', () => {
        it('should reject path with null byte', () => {
            expect(() => validateSQLitePath('db\0.sqlite')).toThrow('Invalid SQLite path: null bytes or control characters detected')
        })

        it('should reject path with control character', () => {
            expect(() => validateSQLitePath('db\x01.sqlite')).toThrow('Invalid SQLite path: null bytes or control characters detected')
        })
    })

    describe('disallowed absolute paths', () => {
        it('should reject Windows absolute path (C:\\)', () => {
            expect(() => validateSQLitePath('C:\\Windows\\System32\\db.sqlite')).toThrow(
                'Invalid SQLite path: Windows absolute paths are not allowed'
            )
        })

        it('should reject UNC path (\\\\server\\share)', () => {
            expect(() => validateSQLitePath('\\\\server\\share\\db.sqlite')).toThrow('Invalid SQLite path: UNC paths are not allowed')
        })

        it('should reject /etc paths (RCE attack vector)', () => {
            expect(() => validateSQLitePath('/etc/chromium/exploit.conf')).toThrow(/Invalid SQLite path:/)
        })

        it('should reject /tmp path', () => {
            expect(() => validateSQLitePath('/tmp/db.sqlite')).toThrow(/Invalid SQLite path:/)
        })

        it('should reject path to frontend build directory (XSS attack vector)', () => {
            expect(() => validateSQLitePath('/usr/local/lib/node_modules/flowise/node_modules/flowise-ui/build/xss.html')).toThrow(
                /Invalid SQLite path:/
            )
        })

        it('should reject path to home directory outside .flowise', () => {
            const outsidePath = path.join(userHome, 'Documents', 'db.sqlite')
            expect(() => validateSQLitePath(outsidePath)).toThrow(/Invalid SQLite path: path must be within/)
        })
    })

    describe('DATABASE_PATH allowlist', () => {
        const originalDatabasePath = process.env.DATABASE_PATH

        afterEach(() => {
            if (originalDatabasePath === undefined) {
                delete process.env.DATABASE_PATH
            } else {
                process.env.DATABASE_PATH = originalDatabasePath
            }
        })

        it('should accept database file under DATABASE_PATH when set', () => {
            const customBase = path.join(userHome, 'custom-flowise-data')
            process.env.DATABASE_PATH = customBase
            const dbPath = path.join(customBase, 'database.sqlite')
            expect(validateSQLitePath(dbPath)).toBe(path.resolve(dbPath))
        })

        it('should still reject paths outside DATABASE_PATH and .flowise', () => {
            process.env.DATABASE_PATH = path.join(userHome, 'custom-flowise-data')
            expect(() => validateSQLitePath('/etc/chromium/exploit.conf')).toThrow(/Invalid SQLite path:/)
        })
    })

    describe('PATH_TRAVERSAL_SAFETY=false bypasses all checks', () => {
        beforeEach(() => {
            process.env.PATH_TRAVERSAL_SAFETY = 'false'
        })
        afterEach(() => {
            delete process.env.PATH_TRAVERSAL_SAFETY
        })

        it('should allow arbitrary absolute Unix path', () => {
            expect(validateSQLitePath('/tmp/db.sqlite')).toBe('/tmp/db.sqlite')
        })

        it('should allow path to /etc (would be blocked normally)', () => {
            expect(validateSQLitePath('/etc/chromium/exploit.conf')).toBe('/etc/chromium/exploit.conf')
        })

        it('should allow path containing ..', () => {
            const result = validateSQLitePath('../db.sqlite')
            expect(typeof result).toBe('string')
        })

        it('should return default when undefined', () => {
            expect(validateSQLitePath(undefined)).toBe(path.join(defaultFlowiseDir, 'database.sqlite'))
        })

        it('should resolve relative path within .flowise when no absolute path given', () => {
            const result = validateSQLitePath('test.db')
            expect(result).toBe(path.join(defaultFlowiseDir, 'test.db'))
        })
    })

    describe('Windows case-insensitive path comparison', () => {
        // Simulate Windows: getUserHome() returns mixed-case path, user supplies lowercase version.
        // path.normalize() on Unix preserves casing, so this exercises the toLowerCase branch.
        beforeEach(() => {
            Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
            jest.spyOn(utils, 'getUserHome').mockReturnValue('/Users/TestUser')
        })

        afterEach(() => {
            Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
            jest.restoreAllMocks()
        })

        it('should accept a valid path whose casing differs from the allowed directory', () => {
            // allowedDir = /Users/TestUser/.flowise (mixed case from getUserHome mock)
            // user input  = /users/testuser/.flowise/mydb.sqlite (all lowercase)
            const result = validateSQLitePath('/users/testuser/.flowise/mydb.sqlite')
            expect(result).toBe('/users/testuser/.flowise/mydb.sqlite')
        })

        it('should still reject a path outside .flowise even after case normalisation', () => {
            expect(() => validateSQLitePath('/users/testuser/documents/mydb.sqlite')).toThrow(/Invalid SQLite path:/)
        })
    })
})

describe('isValidURL', () => {
    describe('accepts valid http/https URLs', () => {
        it.each([
            ['bare http host', 'http://localhost:3000'],
            ['https with path', 'https://flowise.example.com/api'],
            ['http with port and path', 'http://192.168.1.1:3000/api/v1'],
            ['https with query string', 'https://example.com/search?q=hello']
        ])('should accept %s', (_desc, url) => {
            expect(isValidURL(url)).toBe(true)
        })
    })

    describe('rejects non-http(s) protocols', () => {
        it.each([
            ['file protocol', 'file:///etc/passwd'],
            ['javascript protocol', 'javascript:alert(1)'],
            ['ftp protocol', 'ftp://example.com'],
            ['data URI', 'data:text/html,<script>alert(1)</script>']
        ])('should reject %s', (_desc, url) => {
            expect(isValidURL(url)).toBe(false)
        })
    })

    describe('rejects URLs with hash fragments (CVE-2022-24785 bypass entry point)', () => {
        it.each([
            ['plain hash', 'http://localhost:3000/#section'],
            ['hash with injection payload', 'https://evil.com/#";\nrequire("child_process").exec("id");//'],
            ['hash with quote escape', 'http://localhost:3000/#";malicious;//']
        ])('should reject %s', (_desc, url) => {
            expect(isValidURL(url)).toBe(false)
        })
    })

    describe('rejects URLs containing JS string-breaking characters', () => {
        it.each([
            ['double quote', 'http://localhost:3000/path"suffix'],
            ['single quote', "http://localhost:3000/path'suffix"],
            ['backtick', 'http://localhost:3000/path`suffix'],
            ['backslash', 'http://localhost:3000/path\\suffix'],
            ['newline', 'http://localhost:3000/path\nsuffix'],
            ['carriage return', 'http://localhost:3000/path\rsuffix'],
            ['tab', 'http://localhost:3000/path\tsuffix']
        ])('should reject URL with %s', (_desc, url) => {
            expect(isValidURL(url)).toBe(false)
        })
    })

    describe('rejects malformed or empty inputs', () => {
        it.each([
            ['empty string', ''],
            ['not a URL', 'not-a-url'],
            ['relative path', '/api/v1/prediction/abc']
        ])('should reject %s', (_desc, url) => {
            expect(isValidURL(url)).toBe(false)
        })
    })
})

describe('getSafeFilePath', () => {
    const base = path.resolve('/tmp/s3fileloader-abc123')

    describe('returns a contained absolute path for safe keys', () => {
        it.each([
            ['simple filename', 'report.pdf'],
            ['nested key', 'documents/2024/report.pdf'],
            ['internal dot-dot that stays inside', 'a/b/../c.txt'],
            ['leading ./', './notes.txt'],
            ['name starting with dot-dot (not traversal)', '..foo.txt'],
            ['triple dot name', '...'],
            ['dot-dot prefixed dir', '..hidden/file.txt'],
            ['encoded space in legitimate key', 'my%20report.pdf']
        ])('should resolve %s within base', (_desc, key) => {
            const resolved = getSafeFilePath(base, key)
            const relative = path.relative(base, resolved)
            expect(path.isAbsolute(resolved)).toBe(true)
            expect(relative === '..' || relative.startsWith('..' + path.sep)).toBe(false)
            expect(path.isAbsolute(relative)).toBe(false)
        })
    })

    describe('throws on path traversal / absolute keys', () => {
        it.each([
            ['parent traversal', '../escape.txt'],
            ['deep traversal', '../../../../tmp/flowise-poc.txt'],
            ['traversal mid-path', 'a/../../escape.txt'],
            ['bare dot-dot', '..'],
            ['absolute unix path', '/etc/cron.d/evil'],
            ['key resolving to base itself', '.'],
            ['url-encoded traversal', '%2e%2e%2fescape.txt'],
            ['url-encoded traversal mixed', '%2e%2e/escape.txt'],
            ['partially-encoded slash traversal', '..%2f..%2fescape.txt']
        ])('should reject %s', (_desc, key) => {
            expect(() => getSafeFilePath(base, key)).toThrow(/path traversal attempt detected/)
        })
    })

    describe('throws on null bytes', () => {
        it.each([
            ['literal null byte', 'evil\0.txt'],
            ['encoded null byte', 'evil%00.txt']
        ])('should reject %s', (_desc, key) => {
            expect(() => getSafeFilePath(base, key)).toThrow(/null byte detected/)
        })
    })

    describe('throws on missing/invalid keys', () => {
        it.each([
            ['empty string', ''],
            ['undefined', undefined],
            ['null', null]
        ])('should reject %s', (_desc, key) => {
            expect(() => getSafeFilePath(base, key as any)).toThrow(/key is required/)
        })
    })

    describe('PATH_TRAVERSAL_SAFETY=false bypasses the containment check', () => {
        beforeEach(() => {
            process.env.PATH_TRAVERSAL_SAFETY = 'false'
        })
        afterEach(() => {
            delete process.env.PATH_TRAVERSAL_SAFETY
        })

        it('returns the resolved (escaping) path without throwing', () => {
            expect(() => getSafeFilePath(base, '../escape.txt')).not.toThrow()
        })
    })
})
