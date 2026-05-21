/**
 * Regression test for the readonly-rootfs upload bug.
 *
 * Pre-fix, `RealContainer.putFiles` called `putArchive(tar, { path: '/' })`
 * with a tar containing parent directory entries `home/` and
 * `home/user/`. The daemon (with `ReadonlyRootfs: true` set by
 * `DockerBackend.buildCreateOpts`) rejected the entire archive with
 * `400 container rootfs is marked read-only`, the upload silently
 * surfaced `error: 'io_error'`, and the LLM saw `file not found` when
 * trying to `python3 /home/user/skills/...`.
 *
 * The fix groups uploads by writable mount root (`/home/user`, `/tmp`)
 * and submits one `putArchive` call per root with paths relative to
 * that root, so the daemon never walks the readonly rootfs portion of
 * the tar.
 *
 * This test mocks just the parts of `Docker.Container` we touch and
 * inspects the `putArchive` calls directly.
 */

import * as tar from 'tar-stream'
import { Readable } from 'node:stream'

import { RealContainer } from './DockerClient'

interface PutCall {
    path: string
    entries: Array<{ name: string; type: string; size: number; content?: string }>
}

const readTar = async (buf: Buffer): Promise<PutCall['entries']> => {
    const entries: PutCall['entries'] = []
    const extract = tar.extract()
    await new Promise<void>((resolve, reject) => {
        extract.on('entry', (header, stream, next) => {
            const chunks: Buffer[] = []
            stream.on('data', (c: Buffer) => chunks.push(c))
            stream.on('end', () => {
                entries.push({
                    name: header.name,
                    type: header.type as string,
                    size: header.size ?? 0,
                    content: header.type === 'file' ? Buffer.concat(chunks).toString('utf8') : undefined
                })
                next()
            })
            stream.on('error', reject)
        })
        extract.on('finish', () => resolve())
        extract.on('error', reject)
        Readable.from([buf]).pipe(extract)
    })
    return entries
}

const makeContainer = () => {
    const calls: PutCall[] = []
    const fakeDockerodeContainer = {
        async putArchive(tarBuf: Buffer, opts: { path: string }): Promise<void> {
            const entries = await readTar(tarBuf)
            calls.push({ path: opts.path, entries })
        }
    }
    // RealContainer constructor takes a `Docker.Container`; we cast the
    // structurally compatible fake to avoid pulling in dockerode types.
    const container = new RealContainer(fakeDockerodeContainer as unknown as never)
    return { container, calls }
}

describe('RealContainer.putFiles — writable-root grouping (regression test)', () => {
    it('extracts under /home/user with relative paths, NEVER under / with absolute paths', async () => {
        const { container, calls } = makeContainer()

        const result = await container.putFiles([['/home/user/skills/comp_analysis.py', new Uint8Array(Buffer.from('print(1)\n'))]])

        expect(result).toEqual([{ path: '/home/user/skills/comp_analysis.py', error: null }])

        // EXACTLY one putArchive call, targeting the writable volume
        // mount — not root.
        expect(calls).toHaveLength(1)
        expect(calls[0].path).toBe('/home/user')

        // The tar contains only the leaf directory and the file, both
        // relative to /home/user. CRITICALLY, no `home/`, `home/user/`,
        // or `/` entries — those live on the readonly rootfs and would
        // trip the daemon's HTTP 400 check.
        const names = calls[0].entries.map((e) => e.name)
        expect(names).toContain('skills/')
        expect(names).toContain('skills/comp_analysis.py')
        expect(names).not.toContain('home/')
        expect(names).not.toContain('home/user/')
        expect(names).not.toContain('/')

        const fileEntry = calls[0].entries.find((e) => e.type === 'file')
        expect(fileEntry?.content).toBe('print(1)\n')
    })

    it('issues one putArchive per writable root when uploads span /home/user and /tmp', async () => {
        const { container, calls } = makeContainer()

        const result = await container.putFiles([
            ['/home/user/skills/a.py', new Uint8Array(Buffer.from('a'))],
            ['/tmp/scratch.txt', new Uint8Array(Buffer.from('t'))],
            ['/home/user/output/b.md', new Uint8Array(Buffer.from('b'))]
        ])

        // Result order is preserved to match the caller's input — that
        // contract is relied on by BaseSandbox.write and harvestOutputs.
        expect(result.map((r) => r.path)).toEqual(['/home/user/skills/a.py', '/tmp/scratch.txt', '/home/user/output/b.md'])
        for (const r of result) expect(r.error).toBeNull()

        const byPath = new Map(calls.map((c) => [c.path, c]))
        expect(byPath.size).toBe(2)
        expect(byPath.has('/home/user')).toBe(true)
        expect(byPath.has('/tmp')).toBe(true)

        const homeNames = byPath
            .get('/home/user')!
            .entries.map((e) => e.name)
            .sort()
        expect(homeNames).toEqual(expect.arrayContaining(['output/', 'output/b.md', 'skills/', 'skills/a.py']))

        const tmpNames = byPath
            .get('/tmp')!
            .entries.map((e) => e.name)
            .sort()
        expect(tmpNames).toEqual(['scratch.txt'])
    })

    it('rejects paths outside writable mounts without calling putArchive', async () => {
        const { container, calls } = makeContainer()

        const result = await container.putFiles([
            ['/etc/passwd', new Uint8Array(Buffer.from('boom'))],
            ['/home/user/ok.txt', new Uint8Array(Buffer.from('ok'))]
        ])

        const badResult = result.find((r) => r.path === '/etc/passwd')!
        expect(badResult.error).toBe('permission_denied')
        expect(badResult.message).toMatch(/outside the writable sandbox mounts/)

        const okResult = result.find((r) => r.path === '/home/user/ok.txt')!
        expect(okResult.error).toBeNull()

        // Only the writable group reaches putArchive.
        expect(calls).toHaveLength(1)
        expect(calls[0].path).toBe('/home/user')
    })

    it('returns invalid_path for everything in a group when tar building fails', async () => {
        const { container, calls } = makeContainer()

        // `..` is rejected by tarBuilder.normalize. Empty bytes is fine,
        // we only care that the path is rejected.
        const result = await container.putFiles([
            ['/home/user/../../etc/passwd', new Uint8Array()],
            ['/home/user/skills/ok.txt', new Uint8Array(Buffer.from('ok'))]
        ])

        // Both files share /home/user as the writable root, so they
        // group together and ALL fail when tarBuilder rejects one path.
        // This is the documented contract: bad paths take their group
        // down. Callers that want per-file isolation should split the
        // call up themselves.
        const passwdResult = result.find((r) => r.path === '/home/user/../../etc/passwd')!
        expect(passwdResult.error).toBe('invalid_path')

        const okResult = result.find((r) => r.path === '/home/user/skills/ok.txt')!
        expect(okResult.error).toBe('invalid_path')

        expect(calls).toHaveLength(0)
    })

    it('surfaces putArchive errors as io_error on every file in the failing group', async () => {
        const failingContainer = {
            async putArchive(_buf: Buffer, _opts: { path: string }): Promise<void> {
                throw new Error('(HTTP code 400) bad parameters - simulated daemon rejection')
            }
        }
        const container = new RealContainer(failingContainer as unknown as never)

        const result = await container.putFiles([
            ['/home/user/skills/a.py', new Uint8Array(Buffer.from('a'))],
            ['/tmp/b.txt', new Uint8Array(Buffer.from('b'))]
        ])

        for (const r of result) {
            expect(r.error).toBe('io_error')
            expect(r.message).toMatch(/simulated daemon rejection/)
        }
    })

    it('returns an empty array for an empty file list without calling putArchive', async () => {
        const { container, calls } = makeContainer()
        const result = await container.putFiles([])
        expect(result).toEqual([])
        expect(calls).toEqual([])
    })
})
