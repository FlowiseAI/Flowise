import { removeInvalidImageMarkdown, convertRequireToImport, COMMONJS_REQUIRE_REGEX, IMPORT_EXTRACTION_REGEX } from '../src/utils'

describe('removeInvalidImageMarkdown', () => {
    describe('strips non-http/https image markdown', () => {
        it('removes a relative-path image', () => {
            expect(removeInvalidImageMarkdown('![alt](./image.png)')).toBe('')
        })

        it('removes an image with no URL scheme', () => {
            expect(removeInvalidImageMarkdown('![alt](image.png)')).toBe('')
        })

        it('removes a data-URI image', () => {
            expect(removeInvalidImageMarkdown('![alt](data:image/png;base64,abc123)')).toBe('')
        })

        it('removes an image with an absolute local path', () => {
            expect(removeInvalidImageMarkdown('![alt](/some/local/path.png)')).toBe('')
        })
    })

    describe('preserves http and https image markdown', () => {
        it('keeps an https image', () => {
            const input = '![alt](https://example.com/img.png)'
            expect(removeInvalidImageMarkdown(input)).toBe(input)
        })

        it('keeps an http image', () => {
            const input = '![alt](http://example.com/img.png)'
            expect(removeInvalidImageMarkdown(input)).toBe(input)
        })
    })

    describe('non-string inputs pass through unchanged', () => {
        it('returns null as-is', () => {
            expect(removeInvalidImageMarkdown(null as any)).toBeNull()
        })

        it('returns a number as-is', () => {
            expect(removeInvalidImageMarkdown(42 as any)).toBe(42)
        })

        it('returns an object as-is', () => {
            const obj = { a: 1 }
            expect(removeInvalidImageMarkdown(obj as any)).toBe(obj)
        })

        it('returns undefined as-is', () => {
            expect(removeInvalidImageMarkdown(undefined as any)).toBeUndefined()
        })
    })

    describe('mixed content in the same string', () => {
        it('strips relative image but keeps https image', () => {
            const input = 'See ![a](./a.png) and ![b](https://example.com/b.png)'
            expect(removeInvalidImageMarkdown(input)).toBe('See  and ![b](https://example.com/b.png)')
        })

        it('strips multiple non-http images', () => {
            const input = '![x](x.png) text ![y](y.png)'
            expect(removeInvalidImageMarkdown(input)).toBe(' text ')
        })

        it('preserves surrounding text', () => {
            expect(removeInvalidImageMarkdown('before ![alt](./img.png) after')).toBe('before  after')
        })
    })

    describe('edge cases', () => {
        it('handles empty string', () => {
            expect(removeInvalidImageMarkdown('')).toBe('')
        })

        it('handles string with no images', () => {
            expect(removeInvalidImageMarkdown('just text')).toBe('just text')
        })

        it('does not remove a link that is not an image (missing !)', () => {
            expect(removeInvalidImageMarkdown('[alt](./image.png)')).toBe('[alt](./image.png)')
        })
    })
})

// ---------------------------------------------------------------------------
// convertRequireToImport  (line 1459)
// ---------------------------------------------------------------------------

describe('convertRequireToImport', () => {
    describe('default require → default import', () => {
        it('converts const default require', () => {
            expect(convertRequireToImport("const foo = require('bar')")).toBe("import foo from 'bar';")
        })

        it('converts let default require', () => {
            expect(convertRequireToImport("let foo = require('bar')")).toBe("import foo from 'bar';")
        })

        it('converts var default require', () => {
            expect(convertRequireToImport("var foo = require('bar')")).toBe("import foo from 'bar';")
        })

        it('handles scoped package names', () => {
            expect(convertRequireToImport("const pkg = require('@scope/pkg')")).toBe("import pkg from '@scope/pkg';")
        })
    })

    describe('destructured require → named import', () => {
        it('converts single destructured require', () => {
            expect(convertRequireToImport("const { a } = require('bar')")).toBe("import { a } from 'bar';")
        })

        it('converts multiple destructured require', () => {
            expect(convertRequireToImport("const { a, b } = require('bar')")).toBe("import { a, b } from 'bar';")
        })

        it('trims outer whitespace from destructured vars', () => {
            // Leading/trailing spaces around the var list are trimmed; internal spacing preserved
            expect(convertRequireToImport("const {  a, b  } = require('bar')")).toBe("import { a, b } from 'bar';")
        })
    })

    describe('property-access require', () => {
        it('matches as a default import (default pattern takes precedence; .property is not captured)', () => {
            // The default-require pattern at line 1452 has no end-of-string anchor, so it matches
            // `require('bar')` as a prefix of `require('bar').baz`. The property branch is never reached.
            expect(convertRequireToImport("const foo = require('bar').baz")).toBe("import foo from 'bar';")
        })
    })

    describe('indentation preservation', () => {
        it('preserves leading spaces', () => {
            expect(convertRequireToImport("  const foo = require('bar')")).toBe("  import foo from 'bar';")
        })

        it('preserves leading tab', () => {
            expect(convertRequireToImport("\tconst foo = require('bar')")).toBe("\timport foo from 'bar';")
        })
    })

    describe('unrecognised input returns null', () => {
        it('returns null for a console.log call', () => {
            expect(convertRequireToImport("console.log('hello')")).toBeNull()
        })

        it('returns null when require is not called', () => {
            expect(convertRequireToImport("var x = someOtherFunction('y')")).toBeNull()
        })

        it('returns null for an empty string', () => {
            expect(convertRequireToImport('')).toBeNull()
        })
    })
})

// ---------------------------------------------------------------------------
// CommonJS detection regex  (inline at utils.ts line 1579)
// Tests the pattern used to identify require() lines in executeJavaScriptCode
// ---------------------------------------------------------------------------

describe('CommonJS detection regex (utils.ts line 1579 pattern)', () => {
    const commonJsDetectionRegex = COMMONJS_REQUIRE_REGEX

    it('matches a const default require', () => {
        expect(commonJsDetectionRegex.test("const foo = require('x')")).toBe(true)
    })

    it('matches a let default require', () => {
        expect(commonJsDetectionRegex.test("let foo = require('x')")).toBe(true)
    })

    it('matches a destructured require', () => {
        expect(commonJsDetectionRegex.test("const { a } = require('x')")).toBe(true)
    })

    it('does not match a non-require assignment', () => {
        expect(commonJsDetectionRegex.test("const foo = someOtherFn('x')")).toBe(false)
    })

    it('does not match an import statement', () => {
        expect(commonJsDetectionRegex.test("import foo from 'x'")).toBe(false)
    })

    it('does not match a bare require call (no assignment)', () => {
        expect(commonJsDetectionRegex.test("require('x')")).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// Import extraction regex  (inline at utils.ts line 1596)
// Tests the pattern used to extract module names in executeJavaScriptCode
// ---------------------------------------------------------------------------

describe('Import extraction regex (utils.ts line 1596 pattern)', () => {
    const extractModules = (code: string): string[] => {
        const results: string[] = []
        const re = new RegExp(IMPORT_EXTRACTION_REGEX.source, 'g')
        let m: RegExpExecArray | null
        while ((m = re.exec(code)) !== null) {
            results.push(m[1] ?? m[2])
        }
        return results
    }

    it('extracts module from a default import', () => {
        expect(extractModules("import foo from 'lodash'")).toEqual(['lodash'])
    })

    it('extracts module from a named import', () => {
        expect(extractModules("import { a, b } from 'react'")).toEqual(['react'])
    })

    it('extracts module from a namespace import', () => {
        expect(extractModules("import * as x from 'mod'")).toEqual(['mod'])
    })

    it('extracts module from a require call', () => {
        expect(extractModules("require('fs')")).toEqual(['fs'])
    })

    it('extracts module from a require call inside an assignment', () => {
        expect(extractModules("const foo = require('path')")).toEqual(['path'])
    })

    it('extracts a scoped package name', () => {
        expect(extractModules("import x from '@scope/pkg'")).toEqual(['@scope/pkg'])
    })

    it('extracts multiple modules from a multi-line code block', () => {
        const code = ["import foo from 'lodash'", "const bar = require('fs')"].join('\n')
        expect(extractModules(code)).toEqual(['lodash', 'fs'])
    })

    it('returns empty array when there are no imports', () => {
        expect(extractModules('console.log("hello")')).toEqual([])
    })
})
