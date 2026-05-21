/**
 * Sandbox — tar builder for Docker `putArchive`.
 *
 * Builds a single in-memory tar (uncompressed; `putArchive` accepts both
 * raw and gzipped, raw is simpler) from a list of `[path, bytes]` pairs.
 * The resulting buffer is shipped over the daemon socket in one call so
 * `uploadFiles` is one round-trip regardless of file count.
 *
 * Path semantics:
 *   - Each entry path is treated as RELATIVE to the `putArchive` target
 *     directory. The caller (`RealContainer.putFiles`) groups absolute
 *     paths by writable mount, strips the prefix, and passes the
 *     relative remainder here.
 *   - Parent directories internal to the relative path are added
 *     automatically as `directory` entries so `mkdir -p` is unnecessary.
 *   - We deliberately do NOT emit directory entries for the extraction
 *     target itself — putArchive walks the tar from the target directory
 *     and tries to apply metadata to every entry, including parent
 *     directories. If those parent directories live on a read-only
 *     rootfs (we set `ReadonlyRootfs: true`), the daemon rejects the
 *     entire archive with `400 container rootfs is marked read-only`.
 *
 * Permissions:
 *   - `uid: 1000, gid: 1000` to match the non-root `user` in the base image.
 *   - File mode `0644`, directory mode `0755`. Skill code does not need
 *     to be executable — bash invocations are scripted, not direct exec.
 */

import * as tar from 'tar-stream'
import { posix as pathPosix } from 'node:path'

export interface TarBuilderEntry {
    /**
     * POSIX path RELATIVE to the `putArchive` target directory
     * (e.g. `skills/comp_analysis.py` when extracting at `/home/user`).
     * Leading slashes are stripped; absolute paths are not allowed.
     */
    path: string
    bytes: Uint8Array
}

const FILE_MODE = 0o644
const DIR_MODE = 0o755
const UID = 1000
const GID = 1000

const normalize = (p: string): string => {
    if (!p) throw new Error('tarBuilder: empty path')
    if (p.startsWith('/')) {
        throw new Error(`tarBuilder: paths must be relative to the putArchive target, got absolute ${JSON.stringify(p)}`)
    }
    // Reject `..` segments before normalize() collapses them — once
    // resolved, `a/../../etc/passwd` becomes `../etc/passwd` and we
    // lose the chance to refuse the traversal attempt cleanly.
    const rawSegments = p.split('/').filter(Boolean)
    if (rawSegments.includes('..')) {
        throw new Error(`tarBuilder: path contains '..' segments: ${JSON.stringify(p)}`)
    }
    return pathPosix.normalize(p)
}

/**
 * Build a single tar buffer containing every entry plus the
 * directories internal to the relative paths. Directories are emitted
 * before any file that lives inside them so tar extraction never has
 * to backtrack.
 *
 * Ordering rule (do not reorder):
 *   1. Wire up the consumer (`data`/`end`/`error` handlers) on `pack`.
 *   2. Add entries via `pack.entry(...)`.
 *   3. Call `pack.finalize()`.
 *
 * `pack` is a Node Readable with a default highWaterMark (~16 KB). The
 * per-entry callback supplied to `pack.entry(headers, cb)` only fires
 * after the entry's bytes have been forwarded downstream. If we add
 * entries before attaching the consumer, the first entry whose body
 * exceeds the watermark stalls forever — `await writeFile` never
 * resolves, the for-loop never proceeds to `finalize()`, and the
 * caller's `await buildTar(...)` deadlocks. This breaks any real
 * payload (PDFs, DOCXs) while passing for tiny test fixtures, so the
 * regression is easy to miss.
 */
export const buildTar = async (entries: TarBuilderEntry[]): Promise<Buffer> => {
    const pack = tar.pack()

    // STEP 1 — attach the consumer FIRST so `pack` flows as we write.
    // See the doc comment above for why this ordering is load-bearing.
    const collectPromise = new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []
        pack.on('data', (c: Buffer) => chunks.push(c))
        pack.on('end', () => resolve(Buffer.concat(chunks)))
        pack.on('error', reject)
    })

    const seenDirs = new Set<string>()
    const ensureDir = (dirPath: string): void => {
        // Walk from the relative root to the leaf, emitting a directory
        // entry for each prefix we haven't seen yet. Note: no leading
        // slash — these directories are relative to the extraction
        // target.
        const parts = dirPath.split('/').filter(Boolean)
        let cur = ''
        for (const part of parts) {
            cur = cur ? `${cur}/${part}` : part
            if (seenDirs.has(cur)) continue
            seenDirs.add(cur)
            pack.entry({
                name: cur + '/',
                type: 'directory',
                mode: DIR_MODE,
                uid: UID,
                gid: GID,
                mtime: new Date(0)
            })
        }
    }

    // We must wait for each file entry's stream to flush before queueing
    // the next, otherwise pack errors with "already finalized".
    const writeFile = (entry: TarBuilderEntry, body: Buffer): Promise<void> =>
        new Promise<void>((resolve, reject) => {
            const stream = pack.entry(
                {
                    name: entry.path,
                    type: 'file',
                    mode: FILE_MODE,
                    uid: UID,
                    gid: GID,
                    size: body.length,
                    mtime: new Date(0)
                },
                (err) => (err ? reject(err) : resolve())
            )
            stream.end(body)
        })

    // STEP 2 — write entries. Each `pack.entry` callback now fires
    // promptly because the consumer is draining the stream.
    for (const raw of entries) {
        const p = normalize(raw.path)
        const dir = pathPosix.dirname(p)
        if (dir && dir !== '.' && dir !== '/') ensureDir(dir)
        await writeFile({ path: p, bytes: raw.bytes }, Buffer.from(raw.bytes))
    }

    // STEP 3 — close the pack so the consumer's `end` handler runs.
    pack.finalize()

    return collectPromise
}
