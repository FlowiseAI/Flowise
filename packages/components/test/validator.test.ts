import { isPathTraversal, validateMimeTypeAndExtensionMatch, validateVectorStorePath } from '../src/validator'
import path from 'path'
import { getUserHome } from '../src/utils'

describe('isPathTraversal', () => {
    describe('returns true for dangerous patterns', () => {
        it.each([
            ['directory traversal (..)', '../etc/passwd'],
            ['multiple levels of traversal', '../../sensitive'],
            ['bare double-dot', '..'],
            ['Windows absolute path', 'C:\\windows'],
            ['UNC path', '\\\\server\\share'],
            ['URL encoded dot (%2e)', '%2e%2e/etc'],
            ['URL encoded dot uppercase (%2E)', '%2E%2E'],
            ['URL encoded forward slash (%2f)', '%2f'],
            ['URL encoded forward slash uppercase (%2F)', '%2F'],
            ['URL encoded backslash (%5c)', '%5c'],
            ['URL encoded backslash uppercase (%5C)', '%5C'],
            ['null byte', 'path\0name'],
            ['URL encoded null byte (%00)', 'path%00name']
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
            ['absolute Unix path', '/data/uploads'],
            ['relative path with slash', 'uploads/file.txt']
        ])('should not flag %s: %s', (_description, input) => {
            expect(isPathTraversal(input)).toBe(false)
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
})
