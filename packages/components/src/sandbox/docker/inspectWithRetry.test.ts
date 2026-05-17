/**
 * Unit tests for `inspectWithRetry` — the small polling helper that
 * works around the dockerode race where the hijacked stream's `end`
 * event fires fractionally before the daemon updates the exec record.
 *
 * Without this helper, fast silent commands like `mkdir -p` come back
 * with `exitCode: null` and stall the agent loop, because the architecture
 * spec says `null` means "killed before terminating naturally".
 */

import { inspectWithRetry } from './DockerClient'

const makeInspect = (seq: Array<{ Running?: boolean; ExitCode?: number | null }>) => {
    let i = 0
    return jest.fn(async () => {
        const next = seq[i] ?? seq[seq.length - 1]
        i += 1
        return next
    })
}

describe('inspectWithRetry', () => {
    it('returns ExitCode immediately when the first inspect already reports !Running', async () => {
        const inspect = makeInspect([{ Running: false, ExitCode: 0 }])
        const code = await inspectWithRetry(inspect, { sleep: async () => undefined })
        expect(code).toBe(0)
        expect(inspect).toHaveBeenCalledTimes(1)
    })

    it('polls until the daemon clears Running and then returns the real ExitCode', async () => {
        // First two inspects: still running. Third: clean exit 0.
        const inspect = makeInspect([
            { Running: true, ExitCode: null },
            { Running: true, ExitCode: null },
            { Running: false, ExitCode: 0 }
        ])
        const code = await inspectWithRetry(inspect, { sleep: async () => undefined })
        expect(code).toBe(0)
        expect(inspect).toHaveBeenCalledTimes(3)
    })

    it('returns the real ExitCode for non-zero exits', async () => {
        const inspect = makeInspect([
            { Running: true, ExitCode: null },
            { Running: false, ExitCode: 7 }
        ])
        const code = await inspectWithRetry(inspect, { sleep: async () => undefined })
        expect(code).toBe(7)
    })

    it('returns null when the poll budget is exhausted while still Running', async () => {
        const inspect = makeInspect([{ Running: true, ExitCode: null }])
        const code = await inspectWithRetry(inspect, { maxAttempts: 3, sleep: async () => undefined })
        expect(code).toBeNull()
        // 1 initial + 3 retries = 4 calls.
        expect(inspect).toHaveBeenCalledTimes(4)
    })

    it('returns null when inspect throws', async () => {
        const inspect = jest.fn(async () => {
            throw new Error('daemon unreachable')
        })
        const code = await inspectWithRetry(inspect, { sleep: async () => undefined })
        expect(code).toBeNull()
    })

    it('returns null when the daemon ultimately reports !Running but no ExitCode', async () => {
        // This is the rare "exec was killed externally" case — Running
        // flips false but ExitCode never lands. We should NOT default to
        // 0 here; null is the honest answer.
        const inspect = makeInspect([{ Running: false, ExitCode: null }])
        const code = await inspectWithRetry(inspect, { sleep: async () => undefined })
        expect(code).toBeNull()
    })
})
