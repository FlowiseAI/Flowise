/**
 * Tests for the security-critical helpers inside the Skill node.
 *
 * The full `init()` flow is exercised by integration tests; here we
 * pin down the small pure functions whose contract the rest of the
 * runtime relies on — specifically the `sandbox:/...` URI clamp used
 * to decide which sandbox files an agent's `processSandboxLinks` step
 * is allowed to copy into chat-scoped storage. The implementation
 * lives in `sandbox/artifactResolver.ts` because `Skill.ts` finishes
 * with `module.exports = { nodeClass: ... }`, which wipes ES exports.
 */

import { resolveSandboxUriToOutputDir } from './sandbox/artifactResolver'

describe('resolveSandboxUriToOutputDir — security clamp', () => {
    const outputDir = '/home/user/output'

    it('returns the absolute path when the URI is inside outputDir', () => {
        expect(resolveSandboxUriToOutputDir('sandbox:/home/user/output/report.md', outputDir)).toBe('/home/user/output/report.md')
    })

    it('accepts a nested path inside outputDir', () => {
        expect(resolveSandboxUriToOutputDir('sandbox:/home/user/output/sub/a/b/c.csv', outputDir)).toBe('/home/user/output/sub/a/b/c.csv')
    })

    it('collapses redundant slashes (sandbox://x is the same as sandbox:/x)', () => {
        expect(resolveSandboxUriToOutputDir('sandbox://home/user/output/x.md', outputDir)).toBe('/home/user/output/x.md')
    })

    it('rejects a non-sandbox scheme', () => {
        expect(resolveSandboxUriToOutputDir('https://evil.test/home/user/output/x.md', outputDir)).toBeNull()
        expect(resolveSandboxUriToOutputDir('file:///home/user/output/x.md', outputDir)).toBeNull()
        expect(resolveSandboxUriToOutputDir('/home/user/output/x.md', outputDir)).toBeNull()
    })

    it('rejects URIs that escape via `..` even after normalisation', () => {
        expect(resolveSandboxUriToOutputDir('sandbox:/home/user/output/../../../etc/passwd', outputDir)).toBeNull()
        expect(resolveSandboxUriToOutputDir('sandbox:/home/user/output/sub/../../../../etc/passwd', outputDir)).toBeNull()
    })

    it('rejects sibling directories that share the outputDir prefix (no trailing-slash overlap)', () => {
        // `/home/user/output_extra/` and `/home/user/output-backup/`
        // both START with `/home/user/output` but live OUTSIDE outputDir.
        expect(resolveSandboxUriToOutputDir('sandbox:/home/user/output_extra/x.md', outputDir)).toBeNull()
        expect(resolveSandboxUriToOutputDir('sandbox:/home/user/output-backup/x.md', outputDir)).toBeNull()
    })

    it('rejects manifest / helpers directories (cross-skill leakage)', () => {
        expect(resolveSandboxUriToOutputDir('sandbox:/home/user/skills/secret.md', outputDir)).toBeNull()
        expect(resolveSandboxUriToOutputDir('sandbox:/home/user/helpers/pdf_extract.py', outputDir)).toBeNull()
    })

    it('rejects system paths (etc, root, var, ...)', () => {
        for (const uri of ['sandbox:/etc/passwd', 'sandbox:/root/.ssh/id_rsa', 'sandbox:/var/log/messages', 'sandbox:/proc/self/environ']) {
            expect(resolveSandboxUriToOutputDir(uri, outputDir)).toBeNull()
        }
    })

    it('rejects garbage input safely', () => {
        expect(resolveSandboxUriToOutputDir('', outputDir)).toBeNull()
        expect(resolveSandboxUriToOutputDir('sandbox:', outputDir)).toBeNull()
        // `null`/`undefined` are realistic inputs because the URI comes
        // from a regex group that can technically be absent.
        expect(resolveSandboxUriToOutputDir(null as unknown as string, outputDir)).toBeNull()
        expect(resolveSandboxUriToOutputDir(undefined as unknown as string, outputDir)).toBeNull()
    })

    it('honours a non-default outputDir (e.g. a renamed mount)', () => {
        const renamed = '/mnt/data'
        expect(resolveSandboxUriToOutputDir('sandbox:/mnt/data/x.csv', renamed)).toBe('/mnt/data/x.csv')
        // Same prefix-overlap protection on the renamed root.
        expect(resolveSandboxUriToOutputDir('sandbox:/mnt/data-evil/x.csv', renamed)).toBeNull()
    })

    it('tolerates a trailing slash on outputDir without changing the contract', () => {
        const trailing = '/home/user/output/'
        expect(resolveSandboxUriToOutputDir('sandbox:/home/user/output/x.md', trailing)).toBe('/home/user/output/x.md')
        expect(resolveSandboxUriToOutputDir('sandbox:/home/user/output_extra/x.md', trailing)).toBeNull()
    })

    it('rejects pathological lengths (defence against argv blow-up)', () => {
        const longPath = 'a/'.repeat(300) + 'x.md'
        expect(resolveSandboxUriToOutputDir(`sandbox:/home/user/output/${longPath}`, outputDir)).toBeNull()
    })
})
