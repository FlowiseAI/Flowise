/**
 * Validates Python code before execution in Pyodide to prevent remote code
 * execution (RCE). Two entry points are provided:
 *
 *  - validateCustomReadCSVFunction  strict allowlist-based check for the
 *    user-supplied "Custom Pandas Read_CSV Code" field. Only a single
 *    read_csv(...) call that reads from the pre-bound csv_data variable is
 *    permitted. Options must be keyword arguments with literal values.
 *
 *  - validatePythonCodeForDataFrame  denylist-based check for LLM-generated
 *    DataFrame operation code.
 *
 * Both checks must pass before code is handed to pyodide.runPythonAsync().
 * These validators are one defence-in-depth layer; Pyodide execution should
 * still run with restricted network and filesystem access.
 */

export interface PythonCodeValidationResult {
    valid: boolean
    reason?: string
}

/**
 * Forbidden patterns that indicate unsafe Python code.
 * Uses word boundaries and context to minimize false positives (e.g. df.astype is allowed).
 */
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
    // Imports (the executor pre-imports pandas and numpy; LLM code must not add any imports)
    { pattern: /\bfrom\s+\S+\s+import\b/g, reason: 'import statement (from...import)' },
    { pattern: /\bimport\b/g, reason: 'import statement (all imports forbidden; pandas and numpy are pre-imported by the executor)' },
    // Dangerous builtins
    { pattern: /\beval\s*\(/g, reason: 'eval()' },
    { pattern: /\bexec\s*\(/g, reason: 'exec()' },
    { pattern: /\bcompile\s*\(/g, reason: 'compile()' },
    { pattern: /\b__import__\s*\(/g, reason: '__import__()' },
    { pattern: /\bopen\s*\(/g, reason: 'open()' },
    { pattern: /\bbreakpoint\s*\(/g, reason: 'breakpoint()' },
    { pattern: /\binput\s*\(/g, reason: 'input()' },
    { pattern: /\braw_input\s*\(/g, reason: 'raw_input()' },
    { pattern: /\bglobals\s*\(/g, reason: 'globals()' },
    { pattern: /\blocals\s*\(/g, reason: 'locals()' },
    { pattern: /\bgetattr\s*\(/g, reason: 'getattr()' },
    { pattern: /\bsetattr\s*\(/g, reason: 'setattr()' },
    { pattern: /\bdelattr\s*\(/g, reason: 'delattr()' },
    { pattern: /\breload\s*\(/g, reason: 'reload()' },
    { pattern: /\bfile\s*\(/g, reason: 'file()' },
    { pattern: /\bexecfile\s*\(/g, reason: 'execfile()' },
    // Dangerous modules / attributes
    { pattern: /\bos\./g, reason: 'os module' },
    { pattern: /\bsubprocess\./g, reason: 'subprocess module' },
    { pattern: /\bsys\./g, reason: 'sys module' },
    { pattern: /\bsocket\./g, reason: 'socket module' },
    { pattern: /\burllib\./g, reason: 'urllib module' },
    { pattern: /\brequests\./g, reason: 'requests module' },
    { pattern: /\.(?:os|subprocess|sys|socket|urllib|requests)\b/g, reason: 'dangerous module attribute access' },
    { pattern: /\b(?:system|popen)\s*\(/g, reason: 'process execution function' },
    { pattern: /\b__builtins__\b/g, reason: '__builtins__' },
    { pattern: /\b__loader__\b/g, reason: '__loader__' },
    { pattern: /\b__spec__\b/g, reason: '__spec__' },
    { pattern: /\b__class__\b/g, reason: '__class__ (reflection)' },
    { pattern: /\b__subclasses__\s*\(/g, reason: '__subclasses__()' },
    { pattern: /\b__bases__\b/g, reason: '__bases__' },
    { pattern: /\b__mro__\b/g, reason: '__mro__' },
    { pattern: /\b__globals__\b/g, reason: '__globals__' },
    { pattern: /\b__code__\b/g, reason: '__code__' },
    { pattern: /\b__closure__\b/g, reason: '__closure__' },
    { pattern: /\bvars\s*\(/g, reason: 'vars()' },
    { pattern: /\bdir\s*\(/g, reason: 'dir()' },
    { pattern: /\b__dict__\b/g, reason: '__dict__ (attribute reflection)' },
    { pattern: /\b__module__\b/g, reason: '__module__ (module reflection)' },
    // Unsafe deserialization — read_pickle() executes arbitrary Python objects
    { pattern: /\bread_pickle\b/g, reason: 'read_pickle (unsafe deserialization / RCE)' },
    { pattern: /\bpickle\b/g, reason: 'pickle module (unsafe deserialization)' },
    { pattern: /\bmarshal\b/g, reason: 'marshal module (unsafe deserialization)' },
    // Class definitions — used to synthesise file-like objects that smuggle pickle payloads
    { pattern: /\bclass\s+\w/g, reason: 'class definition' }
]

const READ_CSV_PREFIX = 'read_csv('
const MAX_CUSTOM_READ_CSV_LENGTH = 1024

function skipQuotedString(code: string, startIndex: number): number {
    const quote = code[startIndex]
    if (quote !== "'" && quote !== '"') return -1

    let escaped = false
    for (let i = startIndex + 1; i < code.length; i += 1) {
        const char = code[i]

        if (escaped) {
            escaped = false
        } else if (char === '\\') {
            escaped = true
        } else if (char === quote) {
            return i + 1
        }
    }

    return -1
}

function expectedClosingBracket(char: string): string | undefined {
    if (char === '(') return ')'
    if (char === '[') return ']'
    if (char === '{') return '}'
    return undefined
}

function splitTopLevel(code: string, delimiter: string): string[] | undefined {
    const parts: string[] = []
    const bracketStack: string[] = []
    let start = 0

    for (let i = 0; i < code.length; i += 1) {
        const char = code[i]

        if (char === "'" || char === '"') {
            const nextIndex = skipQuotedString(code, i)
            if (nextIndex < 0) return undefined
            i = nextIndex - 1
            continue
        }

        const expectedClosing = expectedClosingBracket(char)
        if (expectedClosing) {
            bracketStack.push(expectedClosing)
        } else if (char === ')' || char === ']' || char === '}') {
            if (bracketStack.pop() !== char) return undefined
        } else if (char === delimiter && bracketStack.length === 0) {
            parts.push(code.slice(start, i).trim())
            start = i + 1
        }
    }

    if (bracketStack.length !== 0) return undefined

    parts.push(code.slice(start).trim())
    return parts
}

function findTopLevelCharacter(code: string, character: string): number {
    const bracketStack: string[] = []

    for (let i = 0; i < code.length; i += 1) {
        const char = code[i]

        if (char === "'" || char === '"') {
            const nextIndex = skipQuotedString(code, i)
            if (nextIndex < 0) return -1
            i = nextIndex - 1
            continue
        }

        const expectedClosing = expectedClosingBracket(char)
        if (expectedClosing) {
            bracketStack.push(expectedClosing)
        } else if (char === ')' || char === ']' || char === '}') {
            if (bracketStack.pop() !== char) return -1
        } else if (char === character && bracketStack.length === 0) {
            return i
        }
    }

    return -1
}

function containsStatementSeparatorOutsideString(code: string): boolean {
    for (let i = 0; i < code.length; i += 1) {
        const char = code[i]

        if (char === "'" || char === '"') {
            const nextIndex = skipQuotedString(code, i)
            if (nextIndex < 0) return true
            i = nextIndex - 1
        } else if (char === '\n' || char === '\r' || char === ';') {
            return true
        }
    }

    return false
}

function findMatchingClosingParen(code: string, openIndex: number): number {
    let depth = 0

    for (let i = openIndex; i < code.length; i += 1) {
        const char = code[i]

        if (char === "'" || char === '"') {
            const nextIndex = skipQuotedString(code, i)
            if (nextIndex < 0) return -1
            i = nextIndex - 1
        } else if (char === '(') {
            depth += 1
        } else if (char === ')') {
            depth -= 1
            if (depth === 0) return i
            if (depth < 0) return -1
        }
    }

    return -1
}

function isQuotedStringLiteral(code: string): boolean {
    return skipQuotedString(code, 0) === code.length
}

function areSafeLiteralItems(code: string): boolean {
    const parts = splitTopLevel(code, ',')
    if (!parts) return false

    return parts.every((part, index) => {
        if (!part && index === parts.length - 1) return true
        return isSafeReadCSVLiteral(part)
    })
}

function isSafeReadCSVLiteral(code: string): boolean {
    const trimmed = code.trim()

    if (!trimmed) return false
    if (isQuotedStringLiteral(trimmed)) return true
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return true
    if (/^(?:True|False|None)$/.test(trimmed)) return true

    const first = trimmed[0]
    const last = trimmed[trimmed.length - 1]

    if ((first === '[' && last === ']') || (first === '(' && last === ')')) {
        const inner = trimmed.slice(1, -1).trim()
        return !inner || areSafeLiteralItems(inner)
    }

    if (first === '{' && last === '}') {
        const inner = trimmed.slice(1, -1).trim()
        const entries = inner ? splitTopLevel(inner, ',') : []
        if (!entries) return false

        return entries.every((entry, index) => {
            if (!entry && index === entries.length - 1) return true

            const colonIndex = findTopLevelCharacter(entry, ':')
            if (colonIndex < 0) return false

            const key = entry.slice(0, colonIndex).trim()
            const value = entry.slice(colonIndex + 1).trim()
            return (isQuotedStringLiteral(key) || /^[+-]?\d+$/.test(key)) && isSafeReadCSVLiteral(value)
        })
    }

    return false
}

function validateReadCSVArguments(args: string): PythonCodeValidationResult {
    const parts = splitTopLevel(args, ',')
    if (!parts || parts.length === 0) {
        return { valid: false, reason: 'read_csv() must receive csv_data as the input source' }
    }

    const [firstArg, ...remainingArgs] = parts
    if (!firstArg) {
        return { valid: false, reason: 'read_csv() must receive csv_data as the input source' }
    }

    const sourceKeyword = firstArg === 'csv_data' ? undefined : 'filepath_or_buffer'
    if (sourceKeyword) {
        const equalsIndex = findTopLevelCharacter(firstArg, '=')
        const firstArgName = equalsIndex >= 0 ? firstArg.slice(0, equalsIndex).trim() : ''
        const firstArgValue = equalsIndex >= 0 ? firstArg.slice(equalsIndex + 1).trim() : ''

        if (firstArgName !== sourceKeyword || firstArgValue !== 'csv_data') {
            return { valid: false, reason: 'read_csv() must read from csv_data directly' }
        }
    }

    const seenKeywords = new Set(['filepath_or_buffer'])
    for (const arg of remainingArgs) {
        if (!arg) {
            return { valid: false, reason: 'read_csv() options must not contain empty arguments' }
        }

        const equalsIndex = findTopLevelCharacter(arg, '=')
        if (equalsIndex <= 0) {
            return { valid: false, reason: 'read_csv() options must be keyword arguments with literal values' }
        }

        const keyword = arg.slice(0, equalsIndex).trim()
        const value = arg.slice(equalsIndex + 1).trim()

        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(keyword) || keyword.startsWith('__')) {
            return { valid: false, reason: 'read_csv() option names must be plain identifiers' }
        }

        if (seenKeywords.has(keyword)) {
            return { valid: false, reason: 'read_csv() options must not be duplicated' }
        }
        seenKeywords.add(keyword)

        if (!isSafeReadCSVLiteral(value)) {
            return {
                valid: false,
                reason: 'read_csv() option values must be strings, numbers, booleans, None, lists, tuples, or dictionaries'
            }
        }
    }

    return { valid: true }
}

/**
 * Validates that the given Python code is safe to run in the pandas DataFrame context.
 * Call this before passing LLM-generated code to pyodide.runPythonAsync().
 */
export function validatePythonCodeForDataFrame(code: string): PythonCodeValidationResult {
    for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
        pattern.lastIndex = 0
        if (pattern.test(code)) {
            return { valid: false, reason: `Forbidden construct: ${reason}` }
        }
    }

    return { valid: true }
}

/**
 * Strict allowlist validator for the user-supplied "Custom Pandas Read_CSV Code"
 * field.  Only a single read_csv(...) call is permitted — no newlines, no
 * semicolons, and no additional statements.  The denylist is also applied as a
 * second layer of defence.
 *
 * Valid examples:  read_csv(csv_data)
 *                  read_csv(csv_data, sep=';', header=0)
 */
export function validateCustomReadCSVFunction(code: string): PythonCodeValidationResult {
    const trimmed = code.trim()

    if (trimmed.length > MAX_CUSTOM_READ_CSV_LENGTH) {
        return { valid: false, reason: `Custom read_csv code must be ${MAX_CUSTOM_READ_CSV_LENGTH} characters or fewer` }
    }

    // Allowlist: must be a single read_csv() call
    if (!trimmed.startsWith(READ_CSV_PREFIX)) {
        return { valid: false, reason: 'Custom read_csv code must start with read_csv(' }
    }

    // No statement separators outside strings — prevents class definitions and multi-statement payloads
    if (containsStatementSeparatorOutsideString(trimmed)) {
        return {
            valid: false,
            reason: 'Custom read_csv code must be a single function call with no newlines or semicolons'
        }
    }

    const closingParenIndex = findMatchingClosingParen(trimmed, READ_CSV_PREFIX.length - 1)
    if (closingParenIndex !== trimmed.length - 1) {
        return { valid: false, reason: 'Custom read_csv code must be exactly one complete read_csv(...) call' }
    }

    const args = trimmed.slice(READ_CSV_PREFIX.length, closingParenIndex)
    const argsValidation = validateReadCSVArguments(args)
    if (!argsValidation.valid) return argsValidation

    // Apply the denylist as a second layer
    return validatePythonCodeForDataFrame(trimmed)
}
