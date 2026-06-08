import type { PyodideInterface } from 'pyodide'
import * as path from 'path'
import { getUserHome } from '../../../src/utils'
import { markNetworkIsolated } from '../../../src/pythonCodeValidator'

let pyodideInstance: PyodideInterface | undefined

export async function LoadPyodide(): Promise<PyodideInterface> {
    if (pyodideInstance === undefined) {
        const { loadPyodide } = await import('pyodide')
        const obj: any = { packageCacheDir: path.join(getUserHome(), '.flowise', 'pyodideCacheDir') }
        pyodideInstance = await loadPyodide(obj)
        await pyodideInstance.loadPackage(['pandas', 'numpy'])

        // Save the original fetch so non-Pyodide callers (OpenAI, other LLM
        // providers, etc.) are not affected by the Pyodide network guard.
        const _originalFetch: typeof globalThis.fetch = globalThis.fetch

        // Counter tracking concurrent Pyodide Python executions.
        // Incremented before runPythonAsync and decremented in finally so the
        // guard is active for exactly the duration of each execution.
        let _pyodideExecuting = 0

        // Replace globalThis.fetch with a conditional guard.
        // Requests made outside Pyodide execution pass through to the original
        // fetch unchanged. Requests made during Pyodide execution are blocked so
        // LLM-generated code cannot exfiltrate data even if the AST check is
        // somehow bypassed.
        globalThis.fetch = function pyodideGuardedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            if (_pyodideExecuting > 0) {
                return Promise.reject(new Error('[Pyodide] Outbound network requests are disabled for security reasons'))
            }
            return _originalFetch.call(globalThis, input, init)
        }

        // Wrap runPythonAsync so the network guard is active for every Pyodide
        // execution, including the Phase 1 CSV loading and the AST-checked query.
        const _originalRunPythonAsync = pyodideInstance.runPythonAsync.bind(pyodideInstance)
        ;(pyodideInstance as any).runPythonAsync = async function guardedRunPythonAsync(code: string, options?: object): Promise<any> {
            _pyodideExecuting++
            try {
                return await _originalRunPythonAsync(code, options)
            } finally {
                _pyodideExecuting--
            }
        }

        // Signal to runPythonWithASTCheck that network isolation is in place.
        markNetworkIsolated()
    }

    return pyodideInstance
}

export const systemPrompt = `You are working with a pandas dataframe in Python. The name of the dataframe is df.

The columns and data types of a dataframe are given below as a Python dictionary with keys showing column names and values showing the data types.
{dict}

I will ask question, and you will output the Python code using pandas dataframe to answer my question. Do not provide any explanations. Do not respond with anything except the output of the code.

Security: Output ONLY pandas/numpy operations on the dataframe (df). Do not use import, exec, eval, open, os, subprocess, or any other system or file operations. The code will be validated and rejected if it contains such constructs.

Question: {question}
Output Code:`

export const finalSystemPrompt = `You are given the question: {question}. You have an answer to the question: {answer}. Rephrase the answer into a standalone answer.
Standalone Answer:`
