import Docker from 'dockerode'

const docker = new Docker()

export interface ExecuteCommandOptions {
    command: string
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

export async function executeCommand(options: ExecuteCommandOptions): Promise<ExecutionResult> {
    const { command, input, timeout, memoryLimitMb } = options

    const codeB64 = Buffer.from(command).toString('base64')
    const startTime = Date.now()

    const container = await docker.createContainer({
        Image: 'alpine:3.19',
        Cmd: ['/bin/sh', '-c', `echo "$SKILL_CODE_B64" | base64 -d > /tmp/skill && sh /tmp/skill`],
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
