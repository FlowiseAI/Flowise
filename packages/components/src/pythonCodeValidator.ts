/**
 * Validates LLM-generated Python code before execution in Pyodide to prevent
 * remote code execution (RCE). Only allows code that is safe for pandas
 * DataFrame operations. Rejects imports, exec/eval, file/system access, and
 * other dangerous constructs that could escape the intended DataFrame context.
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
    // Imports (we already inject "import pandas as pd"; LLM code must not add modules)
    { pattern: /\bfrom\s+\S+\s+import\b/g, reason: 'import statement (from...import)' },
    { pattern: /\bimport\s+(?!pandas|numpy\b)/g, reason: 'import statement (only pandas/numpy allowed via prelude)' },
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
    { pattern: /\b__closure__\b/g, reason: '__closure__' }
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
