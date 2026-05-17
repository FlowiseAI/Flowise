/**
 * Round-trip tests for tarBuilder + tarReader. Builds a tar in memory,
 * pipes it through `tar-stream`'s extractor (the same parser dockerode
 * uses on the client side), and asserts bytes and metadata survive.
 */

import { Readable } from 'node:stream'
import * as tar from 'tar-stream'
import { buildTar } from './tarBuilder'
import { readFirstFile } from './tarReader'

describe('tarBuilder', () => {
    it('produces a tar with paths relative to the putArchive target, plus internal directory entries', async () => {
        const entries = [
            { path: 'skills/a.txt', bytes: new Uint8Array(Buffer.from('hello')) },
            { path: 'helpers/sub/b.bin', bytes: new Uint8Array([0, 1, 2, 3]) }
        ]
        const buf = await buildTar(entries)

        const seen: Array<{ name: string; type: string; bytes: Buffer | null }> = []
        const extract = tar.extract()
        await new Promise<void>((resolve, reject) => {
            extract.on('entry', (header, stream, next) => {
                const chunks: Buffer[] = []
                stream.on('data', (c: Buffer) => chunks.push(c))
                stream.on('end', () => {
                    seen.push({
                        name: header.name,
                        type: header.type as string,
                        bytes: header.type === 'file' ? Buffer.concat(chunks) : null
                    })
                    next()
                })
                stream.on('error', reject)
            })
            extract.on('finish', () => resolve())
            extract.on('error', reject)
            Readable.from([buf]).pipe(extract)
        })

        const files = seen.filter((s) => s.type === 'file').sort((a, b) => a.name.localeCompare(b.name))
        expect(files.map((f) => f.name)).toEqual(['helpers/sub/b.bin', 'skills/a.txt'])
        expect(files[1].bytes?.toString('utf8')).toBe('hello')
        expect(Array.from(files[0].bytes ?? [])).toEqual([0, 1, 2, 3])

        // Internal directory entries are emitted so `putArchive` can
        // create them inside the writable mount. Crucially, the tar
        // MUST NOT contain entries for the target directory itself
        // (e.g. `home/` or `home/user/`) — those live on the read-only
        // rootfs in our container config and would cause the daemon to
        // reject the entire archive with HTTP 400.
        const dirNames = seen.filter((s) => s.type === 'directory').map((s) => s.name)
        expect(dirNames).toContain('skills/')
        expect(dirNames).toContain('helpers/')
        expect(dirNames).toContain('helpers/sub/')
        expect(dirNames).not.toContain('home/')
        expect(dirNames).not.toContain('home/user/')
        expect(dirNames).not.toContain('/')
    })

    it('rejects absolute paths', async () => {
        await expect(buildTar([{ path: '/home/user/a.txt', bytes: new Uint8Array() }])).rejects.toThrow(/relative/)
    })

    it('rejects parent-directory traversal in paths', async () => {
        await expect(buildTar([{ path: 'a/../../etc/passwd', bytes: new Uint8Array() }])).rejects.toThrow(/\.\./)
    })

    it('does NOT deadlock on a body bigger than tar-stream highWaterMark (~16 KB)', async () => {
        // Regression for the bug where `pack.on('data', …)` was attached
        // AFTER `pack.entry(…)` had been called. Without an attached
        // consumer the pack's internal buffer fills, the entry callback
        // never fires, and `await writeFile(...)` hangs forever — but
        // only for entries whose body exceeds ~16 KB. Anything smaller
        // (like the 34-byte fixture we used earlier) fits in the buffer
        // and passes spuriously. So we use a body well above that watermark.
        const big = Buffer.alloc(256 * 1024, 0x41) // 256 KB of 'A'

        // Race against a hard timeout so a regression manifests as a
        // test failure rather than a hung Jest worker.
        const buildPromise = buildTar([{ path: 'skills/large.bin', bytes: new Uint8Array(big) }])
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('buildTar timed out — likely the data-listener-after-entry deadlock')), 5000).unref()
        )

        const buf = (await Promise.race([buildPromise, timeoutPromise])) as Buffer
        // tar adds 512-byte headers + 1024-byte trailer plus 512-byte
        // block padding, but the body is by far the dominant term, so
        // the resulting tar must contain at least the body bytes.
        expect(buf.length).toBeGreaterThan(big.length)
    })

    it('round-trips multiple large entries (~1 MB total) without hanging', async () => {
        // Stress test: several entries each exceeding the watermark.
        // Mirrors a realistic skill payload (a couple of PDFs + a
        // helper script + a Python file).
        const oneEntry = (n: number) => ({
            path: `skills/file_${n}.bin`,
            bytes: new Uint8Array(Buffer.alloc(200 * 1024, n & 0xff))
        })
        const entries = [oneEntry(0), oneEntry(1), oneEntry(2), oneEntry(3), oneEntry(4)]

        const buildPromise = buildTar(entries)
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('buildTar(multiple large) timed out')), 5000).unref()
        )

        const buf = (await Promise.race([buildPromise, timeoutPromise])) as Buffer
        // Total body ~1 MB; round-tripping through extract should yield
        // every file with the correct size.
        const seen: Array<{ name: string; size: number }> = []
        const extract = tar.extract()
        await new Promise<void>((resolve, reject) => {
            extract.on('entry', (header, stream, next) => {
                let n = 0
                stream.on('data', (c: Buffer) => {
                    n += c.length
                })
                stream.on('end', () => {
                    if (header.type === 'file') seen.push({ name: header.name, size: n })
                    next()
                })
                stream.on('error', reject)
            })
            extract.on('finish', () => resolve())
            extract.on('error', reject)
            Readable.from([buf]).pipe(extract)
        })

        expect(seen).toEqual([
            { name: 'skills/file_0.bin', size: 200 * 1024 },
            { name: 'skills/file_1.bin', size: 200 * 1024 },
            { name: 'skills/file_2.bin', size: 200 * 1024 },
            { name: 'skills/file_3.bin', size: 200 * 1024 },
            { name: 'skills/file_4.bin', size: 200 * 1024 }
        ])
    })
})

describe('tarReader.readFirstFile', () => {
    const makeSingleFileTar = async (name: string, body: Buffer): Promise<Buffer> => {
        const pack = tar.pack()
        await new Promise<void>((resolve, reject) =>
            pack.entry({ name, type: 'file', size: body.length }, body, (err) => (err ? reject(err) : resolve()))
        )
        pack.finalize()
        return collect(pack)
    }

    const makeDirOnlyTar = async (name: string): Promise<Buffer> => {
        const pack = tar.pack()
        pack.entry({ name, type: 'directory', mode: 0o755 })
        pack.finalize()
        return collect(pack)
    }

    it('extracts a single regular file from a getArchive-style tar', async () => {
        const tarBuf = await makeSingleFileTar('a.txt', Buffer.from('payload'))
        const r = await readFirstFile(Readable.from([tarBuf]), '/home/user/a.txt')
        expect(r.bytes).not.toBeNull()
        expect(Buffer.from(r.bytes!).toString('utf8')).toBe('payload')
        expect(r.isDirectory).toBe(false)
    })

    it('reports isDirectory when the tar holds only a directory entry', async () => {
        const tarBuf = await makeDirOnlyTar('skills/')
        const r = await readFirstFile(Readable.from([tarBuf]), '/home/user/skills')
        expect(r.bytes).toBeNull()
        expect(r.isDirectory).toBe(true)
    })

    it('returns bytes=null when the tar is empty', async () => {
        const pack = tar.pack()
        pack.finalize()
        const r = await readFirstFile(Readable.from([await collect(pack)]), '/home/user/missing.txt')
        expect(r.bytes).toBeNull()
        expect(r.isDirectory).toBe(false)
    })
})

const collect = (stream: NodeJS.ReadableStream): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        stream.on('data', (c: Buffer) => chunks.push(c))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
    })
