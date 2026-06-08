/**
 * Python code validation before execution in Pyodide.
 *
 * Two entry points are provided:
 *
 *  - validateReadCSVInput   strict allowlist for the user-supplied
 *    "Custom Pandas Read_CSV Code" field. Only a single read_csv(...)
 *    call that reads from the pre-bound csv_data variable is permitted.
 *    Options must be keyword arguments with literal values.
 *
 *  - runPythonWithASTCheck  AST-based allowlist check for LLM-generated
 *    DataFrame query code, followed by execution. Uses Python's own ast
 *    module (via Pyodide) to parse the code and walk the AST, rejecting
 *    anything outside the permitted set. Catches pandas/numpy alias
 *    rebinding, dunder access, bare references to dangerous builtins (e.g.
 *    "f = eval; f(...)"), dangerous numpy submodules (e.g. np.ctypeslib),
 *    string-evaluating/deserializing/sink methods (query, eval, pipe,
 *    to_pickle, read_pickle, to_sql, to_gbq, to_clipboard) and file-writing IO
 *    methods (to_csv, to_json, ... when given a path) that regex-based checks
 *    cannot detect.
 *
 * Network isolation must be active (markNetworkIsolated() called after
 * the fetch patch in LoadPyodide) before runPythonWithASTCheck will run.
 */

import type { PyodideInterface } from 'pyodide'

export interface PythonCodeValidationResult {
    valid: boolean
    reason?: string
}

/**
 * Normalizes code the same way CPython does before tokenizing identifiers,
 * applying NFKC normalization (PEP 3131) and removing backslash-newline line
 * continuations so the validator observes exactly what the interpreter runs.
 * This closes Unicode homoglyph and line-continuation bypasses.
 * @param code - Raw Python source to normalize
 * @returns The NFKC-normalized source with line continuations removed
 */
function normalizeForValidation(code: string): string {
    return code.normalize('NFKC').replace(/\\\n/g, '')
}

/**
 * Error thrown by runPythonWithASTCheck when the AST allowlist rejects code.
 * Agents catch this separately from runtime errors so the security reason is
 * surfaced to the caller rather than being replaced by a generic message.
 */
export class PythonSecurityError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'PythonSecurityError'
    }
}

// ---------------------------------------------------------------------------
// Network isolation guard
// ---------------------------------------------------------------------------

let _networkIsolated = false

/**
 * Marks Pyodide network isolation as active. Called by LoadPyodide() after the
 * fetch guard is installed; runPythonWithASTCheck() refuses to execute until
 * this has been called, preventing accidental skipping of network isolation.
 */
export function markNetworkIsolated(): void {
    _networkIsolated = true
}

// ---------------------------------------------------------------------------
// Helpers for validateReadCSVInput
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API — validateReadCSVInput
// ---------------------------------------------------------------------------

/**
 * Strictly validates the user-supplied "Custom Pandas Read_CSV Code" field,
 * permitting only a single read_csv(...) call that reads from csv_data with
 * keyword-argument literal options (no newlines, semicolons, or extra
 * statements). Valid examples: read_csv(csv_data) or read_csv(csv_data, sep=';').
 * @param code - The custom read_csv code to validate
 * @returns Validation result; valid is false with a reason when rejected
 */
export function validateReadCSVInput(code: string): PythonCodeValidationResult {
    const trimmed = normalizeForValidation(code).trim()

    if (trimmed.length > MAX_CUSTOM_READ_CSV_LENGTH) {
        return { valid: false, reason: `Custom read_csv code must be ${MAX_CUSTOM_READ_CSV_LENGTH} characters or fewer` }
    }

    if (!trimmed.startsWith(READ_CSV_PREFIX)) {
        return { valid: false, reason: 'Custom read_csv code must start with read_csv(' }
    }

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
    return validateReadCSVArguments(args)
}

// ---------------------------------------------------------------------------
// Public API — buildASTCheckerCode / runPythonWithASTCheck
// ---------------------------------------------------------------------------

/**
 * Default set of pd.* function/attribute names permitted in LLM-generated
 * query code. These are safe operations that do not perform IO or network
 * requests. Operators may extend this list via PYODIDE_ALLOWED_PD_FUNCTIONS.
 */
export const DEFAULT_ALLOWED_PD_ATTRS: ReadonlySet<string> = new Set([
    'isna',
    'notna',
    'isnull',
    'notnull',
    'to_datetime',
    'to_numeric',
    'to_timedelta',
    'NA',
    'NaT',
    'Series',
    'DataFrame',
    'Index',
    'MultiIndex',
    'Categorical',
    'concat',
    'merge',
    'merge_asof',
    'merge_ordered',
    'get_dummies',
    'factorize',
    'cut',
    'qcut',
    'date_range',
    'period_range',
    'timedelta_range',
    'json_normalize',
    'melt',
    'pivot_table',
    'crosstab',
    'set_option',
    'get_option',
    'reset_option',
    'options'
])

/**
 * Builds the Python AST-checker script that runs inside Pyodide. The script
 * reads the target code from the Pyodide global `_user_code_to_check` (set by
 * the caller) to avoid string-escaping concerns, raises ValueError on any
 * policy violation, and deletes its internal names so they cannot leak into
 * subsequent user code execution.
 * @param extraAllowedPdFunctions - Additional pd.* names to allow alongside the defaults
 * @returns The Python AST-checker script as a string
 */
export function buildASTCheckerCode(extraAllowedPdFunctions: string[]): string {
    const validExtra = extraAllowedPdFunctions.filter((f) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(f))
    const allAllowed = [...DEFAULT_ALLOWED_PD_ATTRS, ...validExtra]
    const allowedSetLiteral = allAllowed.map((f) => `'${f}'`).join(', ')

    return `
import ast as _ast

_ALLOWED_PD_ATTRS = frozenset({${allowedSetLiteral}})

_FORBIDDEN_CALL_NAMES = frozenset({
    'eval', 'exec', 'compile', '__import__', 'open',
    'breakpoint', 'input', 'raw_input', 'globals',
    'locals', 'vars', 'dir', 'getattr', 'setattr',
    'delattr', 'reload', 'execfile',
})

# Dangerous numpy submodules reachable via attribute chains (e.g. np.ctypeslib.load_library).
_FORBIDDEN_NP_SUBMODULES = frozenset({'ctypeslib', 'f2py', 'distutils'})

# Methods that evaluate strings, (de)serialize, invoke arbitrary callables, or
# write to external sinks. Blocked on any receiver, regardless of arguments.
_FORBIDDEN_METHODS = frozenset({
    'query', 'eval', 'pipe',
    'to_pickle', 'read_pickle',
    'to_sql', 'to_gbq', 'to_clipboard',
})

# IO methods that return a string when no destination is given, but write to a
# file/buffer when one is. Blocked only when a write target is supplied, so pure
# serialization (e.g. df.to_json(), df.to_csv(index=False)) keeps working.
_FILE_WRITE_METHODS = frozenset({
    'to_csv', 'to_json', 'to_excel', 'to_html', 'to_xml',
    'to_parquet', 'to_feather', 'to_hdf', 'to_stata', 'to_orc',
    'to_latex', 'to_markdown', 'to_string',
})

# First-positional / keyword names that designate a file or buffer write target.
_PATH_KEYWORDS = frozenset({'path_or_buf', 'buf', 'excel_writer', 'path', 'fname'})

def _attr_root(node):
    cur = node
    while isinstance(cur, _ast.Attribute):
        cur = cur.value
    return cur

def _has_write_target(node):
    if node.args:
        first = node.args[0]
        if not (isinstance(first, _ast.Constant) and first.value is None):
            return True
    for _kw in node.keywords:
        if _kw.arg in _PATH_KEYWORDS:
            if not (isinstance(_kw.value, _ast.Constant) and _kw.value.value is None):
                return True
    return False

class _AllowlistChecker(_ast.NodeVisitor):
    def __init__(self):
        self._pd_aliases = {'pd'}
        self._np_aliases = {'np'}

    def visit_Import(self, node):
        raise ValueError("import statements are not permitted in query code")

    def visit_ImportFrom(self, node):
        raise ValueError("from...import statements are not permitted in query code")

    def visit_Assign(self, node):
        if isinstance(node.value, _ast.Name):
            if node.value.id in self._pd_aliases:
                for target in node.targets:
                    if isinstance(target, _ast.Name):
                        self._pd_aliases.add(target.id)
            if node.value.id in self._np_aliases:
                for target in node.targets:
                    if isinstance(target, _ast.Name):
                        self._np_aliases.add(target.id)
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, _ast.Attribute):
            _attr = node.func.attr
            if _attr in _FORBIDDEN_METHODS:
                raise ValueError(f".{_attr}() is not permitted in query code")
            if _attr in _FILE_WRITE_METHODS and _has_write_target(node):
                raise ValueError(f".{_attr}() writing to a file or buffer is not permitted")
            if isinstance(node.func.value, _ast.Name):
                if node.func.value.id in self._pd_aliases:
                    if _attr not in _ALLOWED_PD_ATTRS:
                        raise ValueError(
                            f"pd.{_attr}() is not permitted. "
                            f"Use df operations or allowed pd functions."
                        )
        if isinstance(node.func, _ast.Name):
            if node.func.id in _FORBIDDEN_CALL_NAMES:
                raise ValueError(f"{node.func.id}() is not permitted in query code")
        self.generic_visit(node)

    def visit_Name(self, node):
        if node.id in _FORBIDDEN_CALL_NAMES:
            raise ValueError(f"Reference to '{node.id}' is not permitted in query code")
        if node.id.startswith('__') and node.id.endswith('__'):
            raise ValueError(f"Reference to dunder name '{node.id}' is not permitted")
        self.generic_visit(node)

    def visit_Attribute(self, node):
        if node.attr.startswith('__') and node.attr.endswith('__'):
            raise ValueError(f"Access to dunder attribute '{node.attr}' is not permitted")
        if node.attr in _FORBIDDEN_NP_SUBMODULES:
            root = _attr_root(node)
            if isinstance(root, _ast.Name) and root.id in self._np_aliases:
                raise ValueError(f"np.{node.attr} is not permitted in query code")
        self.generic_visit(node)

_checker_instance = _AllowlistChecker()
try:
    _tree = _ast.parse(_user_code_to_check)
    _checker_instance.visit(_tree)
except SyntaxError as _e:
    raise ValueError(f"Syntax error in generated code: {_e}")
finally:
    del _ast, _ALLOWED_PD_ATTRS, _FORBIDDEN_CALL_NAMES, _FORBIDDEN_NP_SUBMODULES, _FORBIDDEN_METHODS, _FILE_WRITE_METHODS, _PATH_KEYWORDS, _attr_root, _has_write_target, _AllowlistChecker, _checker_instance
    try:
        del _tree
    except NameError:
        pass
    try:
        del _user_code_to_check
    except NameError:
        pass
`
}

/**
 * Validates LLM-generated DataFrame query code with an AST allowlist (via
 * Pyodide's ast module) and then executes it with pandas and numpy pre-imported.
 * This is the single safe entry point for executing LLM-generated Python code.
 * The code is passed to Pyodide via globals.set() rather than embedded as a
 * string literal, so injection via crafted code strings is not possible.
 * @param pyodide - The initialized Pyodide instance
 * @param userCode - The LLM-generated Python code to validate and execute
 * @returns The execution result normalized to a human-readable string
 * @throws PythonSecurityError if the AST allowlist rejects the code
 * @throws Error if Pyodide network isolation is not active
 */
export async function runPythonWithASTCheck(pyodide: PyodideInterface, userCode: string): Promise<string> {
    if (!_networkIsolated) {
        throw new Error(
            '[Security] Pyodide network isolation is not active. ' + 'LoadPyodide() must be called before executing any Python code.'
        )
    }

    const extraAllowedPdFunctions = (process.env.PYODIDE_ALLOWED_PD_FUNCTIONS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

    const checkerCode = buildASTCheckerCode(extraAllowedPdFunctions)

    pyodide.globals.set('_user_code_to_check', userCode)
    try {
        await pyodide.runPythonAsync(checkerCode)
    } catch (err: any) {
        const reason = err?.message ?? String(err)
        throw new PythonSecurityError(
            `Generated code was rejected for security reasons (${reason}). ` +
                `Please rephrase your question to use only pandas DataFrame operations.`
        )
    } finally {
        // The checker script's own finally block already deletes this global,
        // so guard against a second delete which would raise a Python KeyError.
        if (pyodide.globals.has('_user_code_to_check')) {
            pyodide.globals.delete('_user_code_to_check')
        }
    }

    const result = await pyodide.runPythonAsync(`import pandas as pd\nimport numpy as np\n${userCode}`)
    return convertPyResultToString(result)
}

/**
 * Converts the value returned by Pyodide into a readable string for the LLM.
 * Pyodide auto-converts scalars (int/float/str/bool) to JS primitives, but
 * returns collections (lists, pandas Series/DataFrame) as a PyProxy that does
 * not stringify usefully on its own; this normalizes both cases and frees any
 * PyProxy to avoid leaking Python memory.
 * @param result - The raw value returned by pyodide.runPythonAsync()
 * @returns A human-readable string representation, or '' for null/undefined
 */
function convertPyResultToString(result: any): string {
    if (result === null || result === undefined) {
        return ''
    }
    if (typeof result === 'string') {
        return result
    }
    if (typeof result === 'number' || typeof result === 'boolean' || typeof result === 'bigint') {
        return String(result)
    }
    try {
        return result.toString()
    } finally {
        if (typeof result.destroy === 'function') {
            try {
                result.destroy()
            } catch {
                // proxy already destroyed or not destroyable — ignore
            }
        }
    }
}
