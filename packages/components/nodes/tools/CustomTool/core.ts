import { z } from 'zod'
import { NodeVM } from 'vm2'
import { RunnableConfig } from '@langchain/core/runnables'
import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { CallbackManagerForToolRun, Callbacks, CallbackManager, parseCallbackConfigArg } from '@langchain/core/callbacks/manager'
import { availableDependencies, defaultAllowBuiltInDep, prepareSandboxVars } from '../../../src/utils'

class ToolInputParsingException extends Error {
    output?: string

    constructor(message: string, output?: string) {
        super(message)
        this.output = output
    }
}

export interface BaseDynamicToolInput extends ToolParams {
    name: string
    description: string
    code: string
    returnDirect?: boolean
}

export interface DynamicStructuredToolInput<
    // eslint-disable-next-line
    T extends z.ZodObject<any, any, any, any> = z.ZodObject<any, any, any, any>
> extends BaseDynamicToolInput {
    func?: (input: z.infer<T>, runManager?: CallbackManagerForToolRun) => Promise<string>
    schema: T
}

export class DynamicStructuredTool<
    // eslint-disable-next-line
    T extends z.ZodObject<any, any, any, any> = z.ZodObject<any, any, any, any>
> extends StructuredTool {
    name: string

    description: string

    code: string

    func: DynamicStructuredToolInput['func']

    schema: T
    private variables: any[]
    private flowObj: any

    constructor(fields: DynamicStructuredToolInput<T>) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.code = fields.code
        this.func = fields.func
        this.returnDirect = fields.returnDirect ?? this.returnDirect
        this.schema = fields.schema
    }

    async call(
        arg: z.output<T>,
        configArg?: RunnableConfig | Callbacks,
        tags?: string[],
        flowConfig?: { sessionId?: string; chatId?: string; input?: string }
    ): Promise<string> {
        const config = parseCallbackConfigArg(configArg)
        if (config.runName === undefined) {
            config.runName = this.name
        }
        let parsed
        try {
            parsed = await this.schema.parseAsync(arg)
        } catch (e) {
            throw new ToolInputParsingException(`Received tool input did not match expected schema`, JSON.stringify(arg))
        }
        const callbackManager_ = await CallbackManager.configure(
            config.callbacks,
            this.callbacks,
            config.tags || tags,
            this.tags,
            config.metadata,
            this.metadata,
            { verbose: this.verbose }
        )
        const runManager = await callbackManager_?.handleToolStart(
            this.toJSON(),
            typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
            undefined,
            undefined,
            undefined,
            undefined,
            config.runName
        )
        let result
        try {
            result = await this._call(parsed, runManager, flowConfig)
        } catch (e) {
            await runManager?.handleToolError(e)
            throw e
        }
        if (result && typeof result !== 'string') {
            result = JSON.stringify(result)
        }
        await runManager?.handleToolEnd(result)
        return result
    }

    // @ts-ignore
    protected async _call(
        arg: z.output<T>,
        _?: CallbackManagerForToolRun,
        flowConfig?: { sessionId?: string; chatId?: string; input?: string }
    ): Promise<string> {
        let sandbox: any = {}
        if (typeof arg === 'object' && Object.keys(arg).length) {
            for (const item in arg) {
                sandbox[`$${item}`] = arg[item]
            }
        }

        sandbox['$vars'] = prepareSandboxVars(this.variables)

        // inject flow properties
        if (this.flowObj) {
            sandbox['$flow'] = { ...this.flowObj, ...flowConfig }
        }

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

    setVariables(variables: any[]) {
        this.variables = variables
    }

    setFlowObject(flow: any) {
        this.flowObj = flow
    }
}
