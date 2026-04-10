import { validatePythonCodeForDataFrame } from './pythonCodeValidator'

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
