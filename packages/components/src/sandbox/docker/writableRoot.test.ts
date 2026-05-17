/**
 * Unit tests for the writable-root grouping helpers used by
 * `RealContainer.putFiles`.
 *
 * Why this exists: our containers run with `ReadonlyRootfs: true`, so
 * `putArchive` against the rootfs is rejected by the daemon with
 * `400 container rootfs is marked read-only`. We split uploads by
 * writable mount (`/home/user`, `/tmp`) and submit one archive per
 * mount with paths relative to that mount. These helpers gate that
 * grouping.
 */

import { pickWritableRoot, stripRoot, WRITABLE_ROOTS } from './DockerClient'

describe('pickWritableRoot', () => {
    it('returns /home/user for paths under /home/user/', () => {
        expect(pickWritableRoot('/home/user/skills/foo.py')).toBe('/home/user')
        expect(pickWritableRoot('/home/user/output/report.md')).toBe('/home/user')
        expect(pickWritableRoot('/home/user/helpers/pdf_extract.py')).toBe('/home/user')
    })

    it('returns /tmp for paths under /tmp/', () => {
        expect(pickWritableRoot('/tmp/scratch.txt')).toBe('/tmp')
        expect(pickWritableRoot('/tmp/sub/dir/file')).toBe('/tmp')
    })

    it('returns the root itself when the path is exactly the mount point', () => {
        expect(pickWritableRoot('/home/user')).toBe('/home/user')
        expect(pickWritableRoot('/tmp')).toBe('/tmp')
    })

    it('returns null for paths that are NOT inside any writable mount', () => {
        expect(pickWritableRoot('/etc/passwd')).toBeNull()
        expect(pickWritableRoot('/usr/bin/python3')).toBeNull()
        expect(pickWritableRoot('/root/secret')).toBeNull()
        // The readonly rootfs portion of /home itself is not writable;
        // only /home/user (the volume) is.
        expect(pickWritableRoot('/home/somebody-else/foo')).toBeNull()
    })

    it('rejects non-absolute inputs (defensive — caller should never pass these)', () => {
        expect(pickWritableRoot('home/user/foo')).toBeNull()
        expect(pickWritableRoot('foo.txt')).toBeNull()
        expect(pickWritableRoot('')).toBeNull()
    })

    it('does NOT match prefixes that share a leading dir but cross the boundary', () => {
        // `/tmpnotmp` must not match `/tmp` — the boundary check is
        // `=== root` OR `startsWith(root + "/")`.
        expect(pickWritableRoot('/tmpnotmp/foo')).toBeNull()
        expect(pickWritableRoot('/home/userrr/x')).toBeNull()
    })
})

describe('stripRoot', () => {
    it('returns the path relative to the writable root', () => {
        expect(stripRoot('/home/user/skills/foo.py', '/home/user')).toBe('skills/foo.py')
        expect(stripRoot('/home/user/output/report.md', '/home/user')).toBe('output/report.md')
        expect(stripRoot('/tmp/scratch.txt', '/tmp')).toBe('scratch.txt')
    })

    it('throws when the path equals the root (nothing to extract — no file to put)', () => {
        expect(() => stripRoot('/home/user', '/home/user')).toThrow(/nothing to extract/)
    })
})

describe('WRITABLE_ROOTS', () => {
    it('is exported so callers can format the error message uniformly', () => {
        expect(WRITABLE_ROOTS).toEqual(['/home/user', '/tmp'])
    })
})
