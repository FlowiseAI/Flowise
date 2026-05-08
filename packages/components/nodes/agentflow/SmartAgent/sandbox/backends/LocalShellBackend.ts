import { spawn } from 'node:child_process'
import { LocalBackend } from './LocalBackend'
import { ExecuteResult, LOCAL_SHELL_TIMEOUT_DEFAULT_MS, MAX_OUTPUT_BYTES, ShellBackendProtocol } from '../BackendProtocol'

const SANDBOX_VIRTUAL_PREFIXES = ['/workspace', '/artifacts', '/memories', '/large_tool_results', '/conversation_history'] as const

/**
 * Dev-only `BackendProtocol` with shell `execute`. No isolation: `cwd` only
 * sets the starting directory; the shell can `cd /` freely. Opt in via
 * `SANDBOX_TYPE=local-shell`. Never enable in production.
 */
export class LocalShellBackend extends LocalBackend implements ShellBackendProtocol {
    constructor(rootPath?: string) {
        super(rootPath)
        console.warn('<WARN> LocalShellBackend is enabled — do not use in production')
    }

    /**
     * Rewrite known virtual filesystem prefixes (e.g. `/workspace/`, `/artifacts/`)
     * to the sandbox root before passing a command to the shell. Without this, the
     * agent's `/workspace/foo` (a virtual path the FS tools resolve under
     * `this.root`) would be sent verbatim to the shell, which interprets `/`
     * as the host root and fails.
     *
     * Other absolute paths (e.g. `/etc/passwd`, `/usr/bin/python3`) pass through
     * untouched — they're real host paths the agent legitimately wants.
     */
    private rewriteVirtualPaths(command: string): string {
        const escapedRoot = `'${this.root.replace(/'/g, `'\\''`)}'`
        let result = command
        for (const prefix of SANDBOX_VIRTUAL_PREFIXES) {
            const escapedPrefix = prefix.replace(/\//g, '\\/')
            // Match prefix at word boundary, not preceded by another path char.
            const pattern = new RegExp(`(?<![\\w/.-])${escapedPrefix}\\b`, 'g')
            result = result.replace(pattern, `${escapedRoot}${prefix}`)
        }
        return result
    }

    async execute(command: string): Promise<ExecuteResult> {
        const timeoutMs = Number(process.env.SANDBOX_LOCAL_SHELL_TIMEOUT_MS) || LOCAL_SHELL_TIMEOUT_DEFAULT_MS

        return new Promise((resolve) => {
            let stdout = ''
            let stderr = ''
            let timedOut = false
            let settled = false

            const child = spawn(this.rewriteVirtualPaths(command), {
                shell: true,
                cwd: this.root,
                env: process.env
            })

            const timer = setTimeout(() => {
                timedOut = true
                child.kill('SIGTERM')
            }, timeoutMs)

            const finish = (result: ExecuteResult): void => {
                if (settled) return
                settled = true
                clearTimeout(timer)
                resolve(result)
            }

            child.stdout.on('data', (d) => {
                stdout += d.toString()
            })
            child.stderr.on('data', (d) => {
                stderr += d.toString()
            })

            // 'error' fires only when the shell itself can't be spawned (e.g. fork limit).
            // Normal "command not found" goes through 'close' with non-zero exit.
            child.on('error', (err) => {
                finish({ output: `[stderr] ${err.message}`, exitCode: 1, truncated: false })
            })

            child.on('close', (code) => {
                if (timedOut) {
                    finish({
                        output: `Error: Command timed out after ${Math.floor(timeoutMs / 1000)}s`,
                        exitCode: 124,
                        truncated: false
                    })
                    return
                }

                const stderrLines = stderr
                    ? stderr
                          .split('\n')
                          .filter(Boolean)
                          .map((l) => `[stderr] ${l}`)
                          .join('\n')
                    : ''
                let combined = stderrLines ? `${stdout}${stdout && !stdout.endsWith('\n') ? '\n' : ''}${stderrLines}` : stdout

                let truncated = false
                if (Buffer.byteLength(combined, 'utf8') > MAX_OUTPUT_BYTES) {
                    combined = Buffer.from(combined, 'utf8').subarray(0, MAX_OUTPUT_BYTES).toString('utf8') + '\n\n[output truncated]'
                    truncated = true
                }

                const exitCode = code ?? 0
                if (exitCode !== 0) {
                    combined += `\n\nExit code: ${exitCode}`
                }

                finish({ output: combined, exitCode, truncated })
            })
        })
    }
}
