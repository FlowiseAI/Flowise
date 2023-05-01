import { spawn } from 'child_process'
import { BaseLLM, BaseLLMParams } from 'langchain/llms/base'
import { Generation, LLMResult } from 'langchain/schema'

export class GPT4All extends BaseLLM {
    executablePath: string
    modelPath: string
    promptTimeout: number
    client: ReturnType<typeof spawn> | null = null

    constructor(
        config: {
            executablePath?: string
            modelPath?: string
            promptTimeout?: number
        } & BaseLLMParams
    ) {
        super(config ?? {})
        const executablePath = config.executablePath
        if (!executablePath) {
            throw new Error(`Executable path must be provided`)
        }
        this.executablePath = executablePath

        const modelPath = config.modelPath
        if (!modelPath) {
            throw new Error(`Model path must be provided`)
        }
        this.modelPath = modelPath

        this.promptTimeout = Math.min(1000, config.promptTimeout || 1000)
    }

    close(): void {
        if (this.client !== null) {
            this.client.kill()
            this.client = null
        }
    }

    async open(): Promise<void> {
        if (this.client !== null) {
            this.close()
        }

        let spawnArgs = [this.executablePath, '--model', this.modelPath]

        this.client = spawn(spawnArgs[0], spawnArgs.slice(1), { stdio: ['pipe', 'pipe', 'ignore'] })

        // wait for the bot to be ready
        await new Promise((resolve) => {
            this.client?.stdout?.on('data', (data) => {
                if (data.toString().includes('>')) {
                    resolve(true)
                }
            })
        })
    }

    _llmType(): string {
        return 'gpt4all'
    }

    /**
     * Call out to GPT4All's generate method.
     *
     * @param prompt - The prompt to pass into the model.
     * @param stop - Optional list of stop words to use when generating.
     *
     * @returns the full LLM response.
     *
     * @example
     * ```ts
     * import { GPT4All } from "./Gpt4All.ts";
     * const gpt4All = new GPT4All();
     * const response = await gpt4All.call("Tell me a joke.")
     * ```
     */
    async _call(prompt: string, _stop?: string[]): Promise<string> {
        await this.open()
        const response = await sendMessageAndWaitForResult(this.client, prompt, this.promptTimeout)
        this.close()

        // eslint-disable-next-line
        const ansiEscapeSequences = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
        const finalResponse = response.replace(ansiEscapeSequences, '')
        return finalResponse
    }

    /**
     * Call out to GPT4All's generate method.
     *
     * @param prompts - The prompts to pass into the model.
     * @param stop - Optional list of stop words to use when generating.
     *
     * @returns the full LLM output.
     *
     * @example
     * ```ts
     * import { GPT4All } from "./Gpt4All.ts";
     * const gpt4All = new GPT4All();
     * const response = await gpt4All.generate(["Tell me a joke."])
     * ```
     */
    async _generate(prompts: Array<string>, stop?: string[]): Promise<LLMResult> {
        const generations: Array<Array<Generation>> = []
        for await (const prompt of prompts) {
            const result = await this._call(prompt, stop)
            generations.push([{ text: result }])
        }
        return { generations }
    }
}

function sendMessageAndWaitForResult(client: any, prompt: string, promptTimeout: number): Promise<string> {
    if (client === null) {
        throw new Error('Client is not initialized.')
    }

    client.stdin.write(prompt + '\n')

    return new Promise((resolve, reject) => {
        let response: string = ''
        let timeoutId: NodeJS.Timeout

        const onStdoutData = (data: Buffer) => {
            const text = data.toString()
            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            if (text.includes('>')) {
                terminateAndResolve(response) // Remove the trailing "\f" delimiter
            } else {
                timeoutId = setTimeout(() => {
                    terminateAndResolve(response)
                }, promptTimeout) // Set a timeout of
            }
            response += text
        }

        const onStdoutError = (err: Error) => {
            client.stdout.removeListener('data', onStdoutData)
            client.stdout.removeListener('error', onStdoutError)
            reject(err)
        }

        const terminateAndResolve = (finalResponse: string) => {
            client.stdout.removeListener('data', onStdoutData)
            client.stdout.removeListener('error', onStdoutError)
            // check for > at the end and remove it
            if (finalResponse.endsWith('>')) {
                finalResponse = finalResponse.slice(0, -1)
            }
            resolve(finalResponse)
        }

        client.stdout.on('data', onStdoutData)
        client.stdout.on('error', onStdoutError)
    })
}
