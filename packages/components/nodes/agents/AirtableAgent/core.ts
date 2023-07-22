import type { PyodideInterface } from 'pyodide'
import * as path from 'path'
import { getUserHome } from '../../../src/utils'

let pyodideInstance: PyodideInterface | undefined

export async function LoadPyodide(): Promise<PyodideInterface> {
    if (pyodideInstance === undefined) {
        const { loadPyodide } = await import('pyodide')
        const obj: any = { packageCacheDir: path.join(getUserHome(), '.flowise', 'pyodideCacheDir') }
        pyodideInstance = await loadPyodide(obj)
        await pyodideInstance.loadPackage(['pandas', 'numpy'])
    }

    return pyodideInstance
}

export const systemPrompt = `You are working with a pandas dataframe in Python. The name of the dataframe is df.

The columns and data types of a dataframe are given below as a Python dictionary with keys showing column names and values showing the data types.
{dict}

I will ask question, and you will output the Python code using pandas dataframe to answer my question. Do not provide any explanations. Do not respond with anything except the output of the code.

Question: {question}
Output Code:`

export const finalSystemPrompt = `You are given the question: {question}. You have an answer to the question: {answer}. Rephrase the answer into a standalone answer.
Standalone Answer:`
