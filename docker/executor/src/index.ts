import express from 'express'
import { Semaphore } from 'async-mutex'
import { executeCode } from './executeCode'
import { executeCommand } from './executeCommand'

const app = express()
app.use(express.json({ limit: '10mb' }))

const PORT = parseInt(process.env.PORT || '3100', 10)
const DEFAULT_TIMEOUT = parseInt(process.env.EXECUTOR_TIMEOUT || '30000', 10)
const DEFAULT_MEMORY_MB = parseInt(process.env.EXECUTOR_MEMORY_MB || '256', 10)
const MAX_CONCURRENT = parseInt(process.env.EXECUTOR_MAX_CONCURRENT || '10', 10)

const semaphore = new Semaphore(MAX_CONCURRENT)

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
})

app.post('/execute', async (req, res) => {
    const { type, language, code, input = {}, timeout = DEFAULT_TIMEOUT, memoryLimitMb = DEFAULT_MEMORY_MB } = req.body

    if (!type || !code) {
        res.status(400).json({ error: 'Missing required fields: type, code' })
        return
    }

    if (type === 'code' && !language) {
        res.status(400).json({ error: 'Missing required field: language (for code type)' })
        return
    }

    const [, release] = await semaphore.acquire()

    try {
        let result

        if (type === 'code') {
            result = await executeCode({ language, code, input, timeout, memoryLimitMb })
        } else if (type === 'cli') {
            result = await executeCommand({ command: code, input, timeout, memoryLimitMb })
        } else {
            res.status(400).json({ error: `Unsupported type: ${type}. Supported: code, cli` })
            return
        }

        res.json(result)
    } catch (err: any) {
        res.status(500).json({
            stdout: '',
            stderr: '',
            exitCode: 1,
            executionTimeMs: 0,
            error: err.message || String(err)
        })
    } finally {
        release()
    }
})

app.listen(PORT, () => {
    console.log(`Flowise Executor sidecar listening on port ${PORT}`)
    console.log(`Max concurrent executions: ${MAX_CONCURRENT}`)
    console.log(`Default timeout: ${DEFAULT_TIMEOUT}ms`)
    console.log(`Default memory limit: ${DEFAULT_MEMORY_MB}MB`)
})
