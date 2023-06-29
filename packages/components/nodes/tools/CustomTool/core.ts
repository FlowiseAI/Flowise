import { z } from 'zod'
import { CallbackManagerForToolRun } from 'langchain/callbacks'
import { StructuredTool, ToolParams } from 'langchain/tools'
import { NodeVM } from 'vm2'
import { availableDependencies } from '../../../src/utils'

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

    constructor(fields: DynamicStructuredToolInput<T>) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.code = fields.code
        this.func = fields.func
        this.returnDirect = fields.returnDirect ?? this.returnDirect
        this.schema = fields.schema
    }

    protected async _call(arg: z.output<T>): Promise<string> {
        let sandbox: any = {}
        if (typeof arg === 'object' && Object.keys(arg).length) {
            for (const item in arg) {
                sandbox[`$${item}`] = arg[item]
            }
        }

        const options = {
            console: 'inherit',
            sandbox,
            require: {
                external: false as boolean | { modules: string[] },
                builtin: ['*']
            }
        } as any

        const external = JSON.stringify(availableDependencies)
        if (external) {
            const deps = JSON.parse(external)
            if (deps && deps.length) {
                options.require.external = {
                    modules: deps
                }
            }
        }

        const vm = new NodeVM(options)
        const response = await vm.run(`module.exports = async function() {${this.code}}()`, __dirname)

        return response
    }
}
