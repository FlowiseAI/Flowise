/**
 * Sandbox — tiny async mutex.
 *
 * Hand-rolled to avoid pulling in a dep for a single primitive. Serializes
 * critical sections so the idle reaper, the lifetime timer, and concurrent
 * `execute` / `uploadFiles` / `downloadFiles` callers never race against
 * each other. See `docs/docker_sandbox_plan.md` §3.4.
 */

export class Mutex {
    private queue: Array<() => void> = []
    private locked = false

    /**
     * Run `fn` exclusively. The mutex is released even if `fn` throws,
     * so the next waiter always gets to proceed.
     */
    async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire()
        try {
            return await fn()
        } finally {
            this.release()
        }
    }

    private async acquire(): Promise<void> {
        if (!this.locked) {
            this.locked = true
            return
        }
        return new Promise<void>((resolve) => {
            this.queue.push(resolve)
        })
    }

    private release(): void {
        const next = this.queue.shift()
        if (next) {
            // Stays locked — we just hand the token to the next waiter.
            next()
        } else {
            this.locked = false
        }
    }
}
