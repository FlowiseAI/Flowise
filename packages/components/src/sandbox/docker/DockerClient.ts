/**
 * Sandbox — thin dockerode wrapper.
 *
 * Hides the dockerode types from `DockerBackend` so the backend file
 * only depends on the methods it needs. Also provides a single seam
 * for unit tests: tests inject a fake client that implements this
 * interface without instantiating real `Docker` / `Docker.Container`.
 *
 * Lifecycle:
 *   - `ensureImage(tag)` resolves once the image is available locally.
 *     Throws `image_missing` if it isn't. We deliberately do NOT pull
 *     from a registry — see `docs/docker_sandbox_plan.md` §3.3.
 *   - `createContainer(opts)` creates but does not start the container.
 *   - `exec(container, cmd, timeoutMs)` runs one command and returns
 *     the combined stdout+stderr buffers plus the exit code.
 *   - `putFiles` / `getFiles` use tar streams for binary-safe transfer.
 *   - `remove(container, { force, v })` is the GC.
 */

import Docker from 'dockerode'
import { Duplex, PassThrough } from 'node:stream'
import { SandboxError, FileDownloadResponse, FileUploadResponse, FileOperationError } from '../types'
import { buildTar } from './tarBuilder'
import { readFirstFile } from './tarReader'

/** dockerode constructor opts forwarded verbatim. */
export type DockerConnectionOptions = Docker.DockerOptions

/** Container create options forwarded verbatim. */
export type ContainerCreateOptions = Docker.ContainerCreateOptions

export interface ExecResult {
    /** Combined stdout. */
    stdout: Buffer
    /** Combined stderr. */
    stderr: Buffer
    /** Process exit code; null when the container was killed before reporting one. */
    exitCode: number | null
    /** True iff the command was killed by the timeout race. */
    timedOut: boolean
}

export interface DockerLike {
    ensureImage(image: string): Promise<void>
    isImagePresent(image: string): Promise<boolean>
    createContainer(opts: ContainerCreateOptions): Promise<ContainerLike>
    listSkillContainers(): Promise<Array<{ id: string; remove: () => Promise<void> }>>
}

export interface ContainerLike {
    readonly id: string
    start(): Promise<void>
    remove(opts: { force: boolean; v: boolean }): Promise<void>
    kill(): Promise<void>
    exec(cmd: string[], opts: { user?: string; workingDir?: string; timeoutMs: number }): Promise<ExecResult>
    putFiles(files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]>
    getFiles(paths: string[]): Promise<FileDownloadResponse[]>
}

/**
 * Poll dockerode's `exec.inspect()` until it reports the exec as no
 * longer running, then return the reported ExitCode (or null if the
 * daemon ultimately never reported one).
 *
 * Exported for unit tests. The hijacked exec stream's `end` event can
 * fire fractionally before the daemon updates the exec state record,
 * so a single immediate `inspect()` call may return
 * `{ Running: true, ExitCode: null }` even for a clean exit. This race
 * is the difference between "mkdir -p ran fine, exit 0" and "the
 * agent stalls because exitCode=null".
 */
export const inspectWithRetry = async (
    inspect: () => Promise<{ Running?: boolean; ExitCode?: number | null }>,
    opts: { maxAttempts?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {}
): Promise<number | null> => {
    const maxAttempts = opts.maxAttempts ?? 40
    const intervalMs = opts.intervalMs ?? 25
    const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
    try {
        let info = await inspect()
        let tries = 0
        while (info.Running && tries < maxAttempts) {
            await sleep(intervalMs)
            info = await inspect()
            tries += 1
        }
        return typeof info.ExitCode === 'number' ? info.ExitCode : null
    } catch {
        return null
    }
}

/**
 * Mount roots inside the container that are guaranteed writable.
 *
 * `/home/user` is backed by an anonymous volume (see
 * `DockerBackend.buildCreateOpts`); `/tmp` is backed by a tmpfs. Every
 * other path on the container's filesystem lives on the readonly
 * rootfs — `putArchive` against those paths fails with
 * `400 container rootfs is marked read-only`.
 *
 * Order matters: pickWritableRoot returns the FIRST match, so the
 * longer / more-specific root must come before any of its prefixes.
 */
export const WRITABLE_ROOTS = ['/home/user', '/tmp'] as const

/**
 * Return the writable mount root that contains `absPath`, or null if
 * the path lies outside every writable mount. Used to group uploads by
 * the target directory passed to `putArchive`.
 */
export const pickWritableRoot = (absPath: string): string | null => {
    if (!absPath.startsWith('/')) return null
    for (const root of WRITABLE_ROOTS) {
        if (absPath === root || absPath.startsWith(root + '/')) return root
    }
    return null
}

/** Strip the writable root prefix and any leading slash from `absPath`. */
export const stripRoot = (absPath: string, root: string): string => {
    const tail = absPath === root ? '' : absPath.slice(root.length).replace(/^\/+/, '')
    if (!tail) {
        throw new Error(`stripRoot: path equals the root, nothing to extract: ${absPath}`)
    }
    return tail
}

const fileErrorMessage = (path: string, msg: string): FileOperationError => {
    const m = msg.toLowerCase()
    if (m.includes('no such file') || m.includes('not found') || m.includes('does not exist')) return 'file_not_found'
    if (m.includes('permission')) return 'permission_denied'
    if (m.includes('is a directory')) return 'is_directory'
    if (m.includes('invalid')) return 'invalid_path'
    return 'io_error'
}

// ---------------------------------------------------------------------------
// Real dockerode-backed client
// ---------------------------------------------------------------------------

export class DockerClient implements DockerLike {
    private readonly docker: Docker

    constructor(opts: DockerConnectionOptions = {}) {
        // dockerode's default constructor reads DOCKER_HOST / DOCKER_TLS_VERIFY /
        // DOCKER_CERT_PATH from the env automatically. The empty opts case is
        // the common one on Linux + Docker Desktop.
        this.docker = new Docker(opts)
    }

    async isImagePresent(image: string): Promise<boolean> {
        try {
            await this.docker.getImage(image).inspect()
            return true
        } catch {
            return false
        }
    }

    async ensureImage(image: string): Promise<void> {
        const present = await this.isImagePresent(image)
        if (!present) {
            throw new SandboxError(
                `Docker image ${image} is not present locally. Run scripts/build-skill-sandbox.sh to build it (or set SKILL_DOCKER_IMAGE to a tag you have).`,
                'NOT_INITIALIZED'
            )
        }
    }

    async createContainer(opts: ContainerCreateOptions): Promise<ContainerLike> {
        const c = await this.docker.createContainer(opts)
        return new RealContainer(c)
    }

    async listSkillContainers(): Promise<Array<{ id: string; remove: () => Promise<void> }>> {
        const containers = await this.docker.listContainers({
            all: true,
            filters: { label: ['flowise.skill_sandbox=true'] }
        })
        return containers.map((c) => ({
            id: c.Id,
            remove: async () => {
                try {
                    await this.docker.getContainer(c.Id).remove({ force: true, v: true })
                } catch {
                    // best-effort: shutdown hooks are not allowed to throw.
                }
            }
        }))
    }
}

/**
 * Concrete `ContainerLike` backed by a real `dockerode` container. The
 * class is exported so unit tests can construct it with a structurally
 * compatible fake — see `DockerClient.putFiles.test.ts`. Production
 * code paths through `DockerClient.createContainer()` should treat it
 * as an internal implementation detail.
 */
export class RealContainer implements ContainerLike {
    constructor(private readonly c: Docker.Container) {}

    get id(): string {
        return this.c.id
    }

    async start(): Promise<void> {
        await this.c.start()
    }

    async remove(opts: { force: boolean; v: boolean }): Promise<void> {
        await this.c.remove(opts)
    }

    async kill(): Promise<void> {
        try {
            await this.c.kill()
        } catch {
            // already gone is fine.
        }
    }

    async exec(cmd: string[], opts: { user?: string; workingDir?: string; timeoutMs: number }): Promise<ExecResult> {
        const exec = await this.c.exec({
            Cmd: cmd,
            AttachStdout: true,
            AttachStderr: true,
            User: opts.user,
            WorkingDir: opts.workingDir
        })
        const stream = (await exec.start({ hijack: true, stdin: false })) as Duplex

        const stdout = new PassThrough()
        const stderr = new PassThrough()
        ;(
            this.c as unknown as { modem: { demuxStream: (s: Duplex, o: NodeJS.WritableStream, e: NodeJS.WritableStream) => void } }
        ).modem.demuxStream(stream, stdout, stderr)

        const stdoutBufs: Buffer[] = []
        const stderrBufs: Buffer[] = []
        stdout.on('data', (c: Buffer) => stdoutBufs.push(c))
        stderr.on('data', (c: Buffer) => stderrBufs.push(c))

        let timedOut = false
        const timer = setTimeout(() => {
            timedOut = true
            // Killing the *container* (not just the exec) terminates child
            // processes that ignored SIGTERM. The backend treats the
            // container as dead after a timeout.
            this.kill().catch(() => undefined)
        }, opts.timeoutMs)

        // Wait for the upstream exec stream to end, then explicitly end
        // and drain the demuxed passthroughs before reading the buffers.
        // dockerode's `demuxStream` writes synchronously to the
        // passthroughs as bytes arrive but does NOT end them when the
        // upstream ends, so without this explicit drain the last buffered
        // chunks can still be sitting in the PassThrough's queue when we
        // call `Buffer.concat(stdoutBufs)`.
        await new Promise<void>((resolve) => {
            let upstreamDone = false
            let stdoutDone = false
            let stderrDone = false
            const tryResolve = () => {
                if (upstreamDone && stdoutDone && stderrDone) resolve()
            }
            const onUpstreamFinish = () => {
                if (upstreamDone) return
                upstreamDone = true
                stdout.end()
                stderr.end()
                tryResolve()
            }
            stream.on('end', onUpstreamFinish)
            stream.on('close', onUpstreamFinish)
            stream.on('error', onUpstreamFinish)
            stdout.on('end', () => {
                stdoutDone = true
                tryResolve()
            })
            stderr.on('end', () => {
                stderrDone = true
                tryResolve()
            })
        })

        clearTimeout(timer)

        // Poll inspect() until the daemon reports the exec as no longer
        // running. The `end` event on the hijacked stream can fire
        // fractionally before the daemon updates the exec state, so a
        // single immediate inspect() may return { Running: true,
        // ExitCode: null } even on a clean exit. Without this poll, fast
        // silent commands like `mkdir -p` surface as exitCode=null and
        // look like "the process was killed before terminating" to the
        // agent loop.
        const exitCode = timedOut
            ? null
            : await inspectWithRetry(() => exec.inspect() as Promise<{ Running?: boolean; ExitCode?: number | null }>)

        return {
            stdout: Buffer.concat(stdoutBufs),
            stderr: Buffer.concat(stderrBufs),
            exitCode,
            timedOut
        }
    }

    async putFiles(files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]> {
        if (!files.length) return []

        // Group by writable mount root. The container has `ReadonlyRootfs:
        // true`; the daemon's `putArchive` validates the entire tar
        // against the target's filesystem before writing anything, so a
        // single archive that touches `/home/` or `/` (even just to
        // assert directory metadata) is rejected with
        // `400 container rootfs is marked read-only`. We therefore split
        // by writable root and submit one archive per root, each with
        // paths relative to that root so the daemon never walks across
        // the readonly portion.
        const groups = new Map<string, Array<{ originalPath: string; relPath: string; bytes: Uint8Array }>>()
        const rejected: FileUploadResponse[] = []
        for (const [originalPath, bytes] of files) {
            const writable = pickWritableRoot(originalPath)
            if (!writable) {
                rejected.push({
                    path: originalPath,
                    error: 'permission_denied',
                    message: `path is outside the writable sandbox mounts (${WRITABLE_ROOTS.join(', ')}): ${originalPath}`
                })
                continue
            }
            const relPath = stripRoot(originalPath, writable)
            const bucket = groups.get(writable) ?? []
            bucket.push({ originalPath, relPath, bytes })
            groups.set(writable, bucket)
        }

        const out: FileUploadResponse[] = [...rejected]

        // Diagnostic logs: surface every hop of the upload so a future
        // hang (in buildTar, in dockerode's putArchive, in the daemon)
        // is immediately localisable from the server logs. Volume is
        // bounded by `groups.size` (≤ WRITABLE_ROOTS.length), so this
        // is cheap to leave on in production.
        for (const [root, entries] of groups.entries()) {
            const totalBytes = entries.reduce((acc, e) => acc + e.bytes.byteLength, 0)
            console.log(`[DockerClient.putFiles] group root=${root} files=${entries.length} totalBytes=${totalBytes} -> buildTar`)
            let tarBuf: Buffer
            try {
                tarBuf = await buildTar(entries.map((e) => ({ path: e.relPath, bytes: e.bytes })))
            } catch (err) {
                const msg = (err as Error)?.message ?? String(err)
                console.warn(`[DockerClient.putFiles] buildTar failed for root=${root}: ${msg}`)
                for (const e of entries) {
                    out.push({ path: e.originalPath, error: 'invalid_path', message: msg })
                }
                continue
            }
            console.log(`[DockerClient.putFiles] buildTar ok root=${root} tarBytes=${tarBuf.length} -> putArchive`)
            try {
                await this.c.putArchive(tarBuf, { path: root })
                console.log(`[DockerClient.putFiles] putArchive ok root=${root} (${entries.length} files)`)
                for (const e of entries) {
                    out.push({ path: e.originalPath, error: null })
                }
            } catch (err) {
                const msg = (err as Error)?.message ?? String(err)
                console.warn(`[DockerClient.putFiles] putArchive failed root=${root}: ${msg}`)
                for (const e of entries) {
                    out.push({ path: e.originalPath, error: fileErrorMessage(e.originalPath, msg), message: msg })
                }
            }
        }

        // Preserve the caller's input order — partial-success consumers
        // (e.g. `BaseSandbox.write`) match responses to requests by index.
        const indexByPath = new Map<string, number>()
        files.forEach(([p], i) => indexByPath.set(p, i))
        out.sort((a, b) => (indexByPath.get(a.path) ?? 0) - (indexByPath.get(b.path) ?? 0))
        return out
    }

    async getFiles(paths: string[]): Promise<FileDownloadResponse[]> {
        if (!paths.length) return []
        const out: FileDownloadResponse[] = []
        for (const p of paths) {
            try {
                const stream = (await this.c.getArchive({ path: p })) as unknown as NodeJS.ReadableStream
                const result = await readFirstFile(stream, p)
                if (result.isDirectory) {
                    out.push({ path: p, content: null, error: 'is_directory' })
                    continue
                }
                if (!result.bytes) {
                    out.push({ path: p, content: null, error: 'file_not_found' })
                    continue
                }
                out.push({ path: p, content: result.bytes, error: null })
            } catch (err) {
                const msg = (err as Error)?.message ?? String(err)
                out.push({ path: p, content: null, error: fileErrorMessage(p, msg), message: msg })
            }
        }
        return out
    }
}
