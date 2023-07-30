import { z } from 'zod'
import { CallbackManagerForToolRun } from 'langchain/callbacks'
import { StructuredTool, ToolParams } from 'langchain/tools'
import { NodeVM } from 'vm2'
import { getUserHome } from '../../../src/utils'
import type { PyodideInterface } from 'pyodide'
import type { PyDict } from 'pyodide/ffi'
import * as path from 'path'

/*
 * List of dependencies allowed to be import in vm2
 */
const availableDependencies = [
    '@dqbd/tiktoken',
    '@getzep/zep-js',
    '@huggingface/inference',
    '@pinecone-database/pinecone',
    '@supabase/supabase-js',
    'axios',
    'cheerio',
    'chromadb',
    'cohere-ai',
    'd3-dsv',
    'form-data',
    'graphql',
    'html-to-text',
    'langchain',
    'linkifyjs',
    'mammoth',
    'moment',
    'node-fetch',
    'pdf-parse',
    'pdfjs-dist',
    'playwright',
    'puppeteer',
    'srt-parser-2',
    'typeorm',
    'weaviate-ts-client'
]

export interface BaseDynamicToolInput extends ToolParams {
    name: string
    description: string
    code: string
    language: string
    returnDirect?: boolean
}

export interface DynamicStructuredToolInput<
    // eslint-disable-next-line
    T extends z.ZodObject<any, any, any, any> = z.ZodObject<any, any, any, any>
> extends BaseDynamicToolInput {
    func?: (input: z.infer<T>, runManager?: CallbackManagerForToolRun) => Promise<string>
    schema: T
}

let pyodideInstance: PyodideInterface | undefined

export async function LoadPyodide(): Promise<PyodideInterface> {
    if (pyodideInstance === undefined) {
        const { loadPyodide } = await import('pyodide')
        const obj: any = { packageCacheDir: path.join(getUserHome(), '.flowise', 'pyodideCacheDir') }
        pyodideInstance = await loadPyodide(obj)
        await pyodideInstance.runPythonAsync(`
from _pyodide_core import jsproxy_typedict
from js import Object
`)
    }

    return pyodideInstance
}

export class DynamicStructuredTool<
    // eslint-disable-next-line
    T extends z.ZodObject<any, any, any, any> = z.ZodObject<any, any, any, any>
> extends StructuredTool {
    name: string

    description: string

    code: string

    language: string

    func: DynamicStructuredToolInput['func']

    schema: T

    constructor(fields: DynamicStructuredToolInput<T>) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.code = fields.code
        this.func = fields.func
        this.language = fields.language
        this.returnDirect = fields.returnDirect ?? this.returnDirect
        this.schema = fields.schema
    }

    private async executePythonCode<T>(sandbox: any) {
        const pyodide = await LoadPyodide()

        let result
        try {
            await pyodide.runPythonAsync('jsproxy_typedict[0] = type(Object.new().as_object_map())')

            // automatically import all packages from code
            await pyodide.loadPackagesFromImports(this.code)

            // convert $ to _
            const pyContext = Object.keys(sandbox).reduce((acc, key) => {
                acc[key.startsWith('$') ? key.replace(/^\$/, '_') : key] = sandbox[key]
                return acc
            }, {} as any)

            const dict = pyodide.globals.get('dict')
            const globalsDict: PyDict = dict()
            for (const key of Object.keys(pyContext)) {
                const value = pyContext[key]
                globalsDict.set(key, value)
            }

            await pyodide.runPythonAsync(`
if 'printOverwrite' in globals():
	print = printOverwrite
			`)

            const runCode = `
async def __main():
${this.code
    .split('\n')
    .map((line) => '  ' + line)
    .join('\n')}
await __main()`
            result = await pyodide.runPythonAsync(runCode, { globals: globalsDict })
            globalsDict.destroy()
        } catch (error) {
            throw new Error(error)
        }

        // https://pyodide.org/en/stable/usage/type-conversions.html#type-translations-pyproxy-to-js
        if (result?.toJs) {
            return result.toJs({
                dict_converter: Object.fromEntries,
                create_proxies: false
            }) as T
        }

        return result as T
    }

    private async executeJsCode(sandbox: any) {
        const defaultAllowBuiltInDep = [
            'assert',
            'buffer',
            'crypto',
            'events',
            'http',
            'https',
            'net',
            'path',
            'querystring',
            'timers',
            'tls',
            'url',
            'zlib'
        ]

        const builtinDeps = process.env.TOOL_FUNCTION_BUILTIN_DEP
            ? defaultAllowBuiltInDep.concat(process.env.TOOL_FUNCTION_BUILTIN_DEP.split(','))
            : defaultAllowBuiltInDep
        const externalDeps = process.env.TOOL_FUNCTION_EXTERNAL_DEP ? process.env.TOOL_FUNCTION_EXTERNAL_DEP.split(',') : []
        const deps = availableDependencies.concat(externalDeps)

        const options = {
            console: 'inherit',
            sandbox,
            require: {
                external: { modules: deps },
                builtin: builtinDeps
            }
        } as any

        const vm = new NodeVM(options)
        const response = await vm.run(`module.exports = async function() {${this.code}}()`, __dirname)

        return response
    }

    protected async _call(arg: z.output<T>): Promise<string> {
        let sandbox: any = {}
        if (typeof arg === 'object' && Object.keys(arg).length) {
            for (const item in arg) {
                sandbox[`$${item}`] = arg[item]
            }
        }

        if (this.language === 'python') {
            return await this.executePythonCode(sandbox)
        }
        return await this.executeJsCode(sandbox)
    }
}
