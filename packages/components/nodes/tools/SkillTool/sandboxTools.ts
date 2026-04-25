import { z } from 'zod'
import { StructuredTool } from '@langchain/core/tools'
import { Sandbox } from '@e2b/code-interpreter'
import { NodeVM } from '@flowiseai/nodevm'

async function callDockerSidecar(body: Record<string, any>): Promise<{ stdout: string; stderr: string; exitCode: number; error?: string }> {
    const url = `${process.env.SKILL_EXECUTOR_URL}/execute`
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Docker executor returned ${response.status}: ${text}`)
    }
    return response.json()
}

export class SandboxedCodeRunnerTool extends StructuredTool {
    name = 'skill_code_runner'
    description = 'Execute JavaScript or Python code in a sandboxed environment. Returns raw stdout/stderr output.'
    schema = z.object({
        language: z.enum(['javascript', 'python']).describe('The programming language to execute'),
        code: z.string().describe('The code to execute')
    })

    static createIfAvailable(): SandboxedCodeRunnerTool | null {
        const hasE2B = !!process.env.E2B_APIKEY
        const hasDocker = !!process.env.SKILL_EXECUTOR_URL
        // NodeVM can handle JavaScript as a fallback
        if (!hasE2B && !hasDocker) {
            // NodeVM only supports JS — still worth exposing the tool
            return new SandboxedCodeRunnerTool()
        }
        return new SandboxedCodeRunnerTool()
    }

    protected async _call(input: { language: 'javascript' | 'python'; code: string }): Promise<string> {
        try {
            // E2B
            if (process.env.E2B_APIKEY) {
                let timeoutMs = 300000
                if (process.env.SANDBOX_TIMEOUT) {
                    timeoutMs = parseInt(process.env.SANDBOX_TIMEOUT, 10)
                }
                const sbx = await Sandbox.create({ apiKey: process.env.E2B_APIKEY, timeoutMs })
                try {
                    const lang = input.language === 'javascript' ? 'js' : 'python'
                    const execution = await sbx.runCode(input.code, { language: lang as any })
                    if (execution.error) {
                        return `Error: ${execution.error.name}: ${execution.error.value}`
                    }
                    let output = ''
                    if (execution.text) output = execution.text
                    else if (execution.logs.stdout.length) output = execution.logs.stdout.join('\n')
                    if (execution.logs.stderr.length) {
                        output += (output ? '\n' : '') + 'stderr: ' + execution.logs.stderr.join('\n')
                    }
                    return output || '(no output)'
                } finally {
                    await sbx.kill()
                }
            }

            // Docker sidecar
            if (process.env.SKILL_EXECUTOR_URL) {
                const result = await callDockerSidecar({
                    type: 'code',
                    language: input.language,
                    code: input.code,
                    input: {},
                    timeout: 30000,
                    memoryLimitMb: 256
                })
                if (result.error) {
                    return `Error: ${result.error}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
                }
                return result.stdout || result.stderr || '(no output)'
            }

            // NodeVM fallback (JavaScript only)
            if (input.language !== 'javascript') {
                return `Error: ${input.language} execution requires E2B or Docker executor sidecar. Only JavaScript is available via NodeVM fallback.`
            }

            console.warn(
                '\u26A0 Running skill code in-process via NodeVM. This has known escape vectors. ' +
                    'For production, configure E2B_APIKEY or deploy the Docker executor sidecar.'
            )
            const vm = new NodeVM({
                console: 'inherit',
                sandbox: {},
                require: {
                    external: false,
                    builtin: [],
                    mock: {}
                },
                eval: false,
                wasm: false,
                timeout: 30000
            })
            const result = await vm.run(`module.exports = async function() { ${input.code} }()`, __dirname)
            return typeof result === 'string' ? result : JSON.stringify(result) ?? '(no output)'
        } catch (err: any) {
            return `Execution error: ${err.message || String(err)}`
        }
    }
}

export class SandboxedCLIRunnerTool extends StructuredTool {
    name = 'skill_cli_runner'
    description = 'Execute a bash command in a sandboxed environment. Returns raw stdout and stderr.'
    schema = z.object({
        command: z.string().describe('The bash command to execute')
    })

    static createIfAvailable(): SandboxedCLIRunnerTool | null {
        const hasE2B = !!process.env.E2B_APIKEY
        const hasDocker = !!process.env.SKILL_EXECUTOR_URL
        if (!hasE2B && !hasDocker) return null
        return new SandboxedCLIRunnerTool()
    }

    protected async _call(input: { command: string }): Promise<string> {
        try {
            // E2B
            if (process.env.E2B_APIKEY) {
                let timeoutMs = 300000
                if (process.env.SANDBOX_TIMEOUT) {
                    timeoutMs = parseInt(process.env.SANDBOX_TIMEOUT, 10)
                }
                const sbx = await Sandbox.create({ apiKey: process.env.E2B_APIKEY, timeoutMs })
                try {
                    const result = await sbx.commands.run(input.command)
                    let output = ''
                    if (result.stdout) output += result.stdout
                    if (result.stderr) output += (output ? '\n' : '') + 'stderr: ' + result.stderr
                    return output || '(no output)'
                } finally {
                    await sbx.kill()
                }
            }

            // Docker sidecar
            const result = await callDockerSidecar({
                type: 'cli',
                language: 'bash',
                code: input.command,
                input: {},
                timeout: 30000,
                memoryLimitMb: 256
            })
            if (result.error) {
                return `Error: ${result.error}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
            }
            return result.stdout || result.stderr || '(no output)'
        } catch (err: any) {
            return `CLI execution error: ${err.message || String(err)}`
        }
    }
}
