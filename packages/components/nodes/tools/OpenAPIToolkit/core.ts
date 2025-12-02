import { z } from 'zod'
import { RequestInit } from 'node-fetch'
import { RunnableConfig } from '@langchain/core/runnables'
import { StructuredTool, ToolParams } from '@langchain/core/tools'
import { CallbackManagerForToolRun, Callbacks, CallbackManager, parseCallbackConfigArg } from '@langchain/core/callbacks/manager'
import { executeJavaScriptCode, createCodeExecutionSandbox, parseWithTypeConversion } from '../../../src/utils'
import { ICommonObject } from '../../../src/Interface'

const removeNulls = (obj: Record<string, any>) => {
    Object.keys(obj).forEach((key) => {
        if (obj[key] === null) {
            delete obj[key]
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            removeNulls(obj[key])
            if (Object.keys(obj[key]).length === 0) {
                delete obj[key]
            }
        }
    })
    return obj
}

interface HttpRequestObject {
    PathParameters?: Record<string, any>
    QueryParameters?: Record<string, any>
    RequestBody?: Record<string, any>
}

export const defaultCode = `const fetch = require('node-fetch');
const url = $url;
const options = $options;

try {
	const response = await fetch(url, options);
	const resp = await response.json();
	return JSON.stringify(resp);
} catch (error) {
	console.error(error);
	return '';
}
`
export const howToUseCode = `- **Libraries:**  
  You can use any libraries imported in Flowise.

- **Tool Input Arguments:**  
  Tool input arguments are available as the following variables:
  - \`$PathParameters\`
  - \`$QueryParameters\`
  - \`$RequestBody\`

- **HTTP Requests:**  
  By default, you can get the following values for making HTTP requests:
  - \`$url\`
  - \`$options\`

- **Default Flow Config:**  
  You can access the default flow configuration using these variables:
  - \`$flow.sessionId\`
  - \`$flow.chatId\`
  - \`$flow.chatflowId\`
  - \`$flow.input\`
  - \`$flow.state\`

- **Custom Variables:**  
  You can get custom variables using the syntax:
  - \`$vars.<variable-name>\`

- **Return Value:**  
  The function must return a **string** value at the end.

\`\`\`js
${defaultCode}
\`\`\`
`

const getUrl = (baseUrl: string, requestObject: HttpRequestObject) => {
    let url = baseUrl

    // Add PathParameters to URL if present
    if (requestObject.PathParameters) {
        for (const [key, value] of Object.entries(requestObject.PathParameters)) {
            url = url.replace(`{${key}}`, encodeURIComponent(String(value)))
        }
    }

    // Add QueryParameters to URL if present
    if (requestObject.QueryParameters) {
        const queryParams = new URLSearchParams(requestObject.QueryParameters as Record<string, string>)
        url += `?${queryParams.toString()}`
    }

    return url
}

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
    returnDirect?: boolean
}

export interface DynamicStructuredToolInput<
    // eslint-disable-next-line
    T extends z.ZodObject<any, any, any, any> = z.ZodObject<any, any, any, any>
> extends BaseDynamicToolInput {
    func?: (input: z.infer<T>, runManager?: CallbackManagerForToolRun) => Promise<string>
    schema: T
    baseUrl: string
    method: string
    headers: ICommonObject
    customCode?: string
    strict?: boolean
    removeNulls?: boolean
}

export class DynamicStructuredTool<
    // eslint-disable-next-line
    T extends z.ZodObject<any, any, any, any> = z.ZodObject<any, any, any, any>
> extends StructuredTool {
    name: string

    description: string

    baseUrl: string

    method: string

    headers: ICommonObject

    customCode?: string

    strict?: boolean

    func: DynamicStructuredToolInput['func']

    // @ts-ignore
    schema: T
    private variables: any[]
    private flowObj: any
    private removeNulls: boolean

    constructor(fields: DynamicStructuredToolInput<T>) {
        super(fields)
        this.name = fields.name
        this.description = fields.description
        this.func = fields.func
        this.returnDirect = fields.returnDirect ?? this.returnDirect
        this.schema = fields.schema
        this.baseUrl = fields.baseUrl
        this.method = fields.method
        this.headers = fields.headers
        this.customCode = fields.customCode
        this.strict = fields.strict
        this.removeNulls = fields.removeNulls ?? false
    }

    async call(
        arg: z.output<T>,
        configArg?: RunnableConfig | Callbacks,
        tags?: string[],
        flowConfig?: { sessionId?: string; chatId?: string; input?: string; state?: ICommonObject }
    ): Promise<string> {
        const config = parseCallbackConfigArg(configArg)
        if (config.runName === undefined) {
            config.runName = this.name
        }
        let parsed
        try {
            parsed = await parseWithTypeConversion(this.schema, arg)
        } catch (e) {
            throw new ToolInputParsingException(`Received tool input did not match expected schema ${e}`, JSON.stringify(arg))
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
        flowConfig?: { sessionId?: string; chatId?: string; input?: string; state?: ICommonObject }
    ): Promise<string> {
        let processedArg = { ...arg }

        if (this.removeNulls && typeof processedArg === 'object' && processedArg !== null) {
            processedArg = removeNulls(processedArg)
        }

        // Create additional sandbox variables for tool arguments
        const additionalSandbox: ICommonObject = {}

        if (typeof processedArg === 'object' && Object.keys(processedArg).length) {
            for (const item in processedArg) {
                additionalSandbox[`$${item}`] = processedArg[item]
            }
        }

        // Prepare HTTP request options
        const callOptions: RequestInit = {
            method: this.method,
            headers: {
                'Content-Type': 'application/json',
                ...this.headers
            }
        }
        if (arg.RequestBody && this.method.toUpperCase() !== 'GET') {
            callOptions.body = JSON.stringify(arg.RequestBody)
        }
        additionalSandbox['$options'] = callOptions

        // Generate complete URL
        const completeUrl = getUrl(this.baseUrl, arg)
        additionalSandbox['$url'] = completeUrl

        // Prepare flow object for sandbox
        const flow = this.flowObj ? { ...this.flowObj, ...flowConfig } : {}

        const sandbox = createCodeExecutionSandbox('', this.variables || [], flow, additionalSandbox)

        let response = await executeJavaScriptCode(this.customCode || defaultCode, sandbox)

        if (typeof response === 'object') {
            response = JSON.stringify(response)
        }

        return response
    }

    setVariables(variables: any[]) {
        this.variables = variables
    }

    setFlowObject(flow: any) {
        this.flowObj = flow
    }

    isStrict(): boolean {
        return this.strict === true
    }
}
