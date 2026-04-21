/**
 * Validates Python code before execution in Pyodide to prevent remote code
 * execution (RCE). Two entry points are provided:
 *
 *  - validateCustomReadCSVFunction  allowlist-based check for the user-supplied
 *    "Custom Pandas Read_CSV Code" field; only a bare read_csv(...) call is
 *    permitted.
 *
 *  - validatePythonCodeForDataFrame  denylist-based check for LLM-generated
 *    DataFrame operation code.
 *
 * Both checks must pass before code is handed to pyodide.runPythonAsync().
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

    // Allowlist: must be a single read_csv() call
    if (!trimmed.startsWith('read_csv(')) {
        return { valid: false, reason: 'Custom read_csv code must start with read_csv(' }
    }

    // No newlines or semicolons — prevents class definitions and multi-statement payloads
    if (/[\n\r;]/.test(trimmed)) {
        return {
            valid: false,
            reason: 'Custom read_csv code must be a single function call with no newlines or semicolons'
        }
    }

    // Apply the denylist as a second layer
    return validatePythonCodeForDataFrame(trimmed)
}
