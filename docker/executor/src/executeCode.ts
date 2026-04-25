import Docker from 'dockerode'

const docker = new Docker()

const LANGUAGE_CONFIG: Record<string, { image: string; runCmd: string; ext: string }> = {
    javascript: { image: 'node:20-alpine', runCmd: 'node /tmp/skill', ext: 'js' },
    python: { image: 'python:3.12-slim', runCmd: 'python3 /tmp/skill', ext: 'py' }
}

export interface ExecuteCodeOptions {
    language: string
    code: string
    input: Record<string, any>
    timeout: number
    memoryLimitMb: number
}

export interface ExecutionResult {
    stdout: string
    stderr: string
    exitCode: number
    executionTimeMs: number
    error?: string
}

export async function executeCode(options: ExecuteCodeOptions): Promise<ExecutionResult> {
    const { language, code, input, timeout, memoryLimitMb } = options
    const config = LANGUAGE_CONFIG[language]

    if (!config) {
        return {
            stdout: '',
            stderr: '',
            exitCode: 1,
            executionTimeMs: 0,
            error: `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_CONFIG).join(', ')}`
        }
    }

    const codeB64 = Buffer.from(code).toString('base64')
    const startTime = Date.now()

    const container = await docker.createContainer({
        Image: config.image,
        Cmd: ['/bin/sh', '-c', `echo "$SKILL_CODE_B64" | base64 -d > /tmp/skill && ${config.runCmd}`],
        Env: [`SKILL_CODE_B64=${codeB64}`, `SKILL_INPUT_JSON=${JSON.stringify(input)}`],
        HostConfig: {
            Memory: memoryLimitMb * 1024 * 1024,
            MemorySwap: memoryLimitMb * 1024 * 1024,
            CpuPeriod: 100000,
            CpuQuota: 50000,
            PidsLimit: 64,
            ReadonlyRootfs: true,
            SecurityOpt: ['no-new-privileges:true'],
            CapDrop: ['ALL'],
            Tmpfs: { '/tmp': 'rw,nosuid,size=64m' },
            Binds: [],
            NetworkMode: 'none',
            AutoRemove: true
        },
        User: '65534:65534',
        WorkingDir: '/tmp',
        StopTimeout: Math.ceil(timeout / 1000)
    })

    try {
        await container.start()

        const stream = await container.logs({ follow: true, stdout: true, stderr: true })
        const stdoutChunks: Buffer[] = []
        const stderrChunks: Buffer[] = []

        // Docker multiplexed stream: 8-byte header per frame
        // header[0]: stream type (1=stdout, 2=stderr), header[4..7]: payload size (big-endian)
        const rawData = await new Promise<Buffer>((resolve) => {
            const chunks: Buffer[] = []
            stream.on('data', (chunk: Buffer) => chunks.push(chunk))
            stream.on('end', () => resolve(Buffer.concat(chunks)))
        })

        let offset = 0
        while (offset < rawData.length) {
            if (offset + 8 > rawData.length) break
            const streamType = rawData[offset]
            const payloadSize = rawData.readUInt32BE(offset + 4)
            offset += 8
            if (offset + payloadSize > rawData.length) break
            const payload = rawData.subarray(offset, offset + payloadSize)
            if (streamType === 2) {
                stderrChunks.push(payload)
            } else {
                stdoutChunks.push(payload)
            }
            offset += payloadSize
        }

        const waitResult = await container.wait()
        const executionTimeMs = Date.now() - startTime

        const stdout = Buffer.concat(stdoutChunks).toString('utf-8')
        const stderr = Buffer.concat(stderrChunks).toString('utf-8')
        const exitCode = waitResult.StatusCode

        let error: string | undefined
        if (exitCode === 137) {
            error = 'Process killed: exceeded memory limit'
        } else if (exitCode === 143) {
            error = 'Process killed: exceeded timeout'
        }

        return { stdout, stderr, exitCode, executionTimeMs, error }
    } catch (err: any) {
        const executionTimeMs = Date.now() - startTime
        // Try to clean up - container might already be removed due to AutoRemove
        try {
            await container.stop({ t: 1 })
        } catch {
            /* ignore */
        }

        return {
            stdout: '',
            stderr: '',
            exitCode: 1,
            executionTimeMs,
            error: err.message || String(err)
        }
    }
}
