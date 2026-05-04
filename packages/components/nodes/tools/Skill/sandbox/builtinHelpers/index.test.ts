import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { BUILTIN_HELPERS, builtinHelpersEnabled, helpersFootprint } from './index'

// ---------------------------------------------------------------------------
// Registry shape — invariants every helper must satisfy so the rest of the
// pipeline (manifest, session materialisation, recipe wiring) can rely on
// a uniform contract.
// ---------------------------------------------------------------------------

describe('BUILTIN_HELPERS — registry invariants', () => {
    it('exports at least one helper (Phase 0 ships pdf_extract)', () => {
        expect(BUILTIN_HELPERS.length).toBeGreaterThanOrEqual(1)
        expect(BUILTIN_HELPERS.find((h) => h.name === 'pdf_extract')).toBeDefined()
    })

    it('each entry uses a kebab-or-snake-case name and a `<name>.py` relPath', () => {
        for (const h of BUILTIN_HELPERS) {
            expect(h.name).toMatch(/^[a-z][a-z0-9_]*$/)
            expect(h.relPath).toBe(`${h.name}.py`)
        }
    })

    it('each entry advertises at least one extension to handle', () => {
        for (const h of BUILTIN_HELPERS) {
            expect(Array.isArray(h.handles)).toBe(true)
            expect(h.handles.length).toBeGreaterThan(0)
            for (const { extension } of h.handles) {
                expect(extension).toBe(extension.toLowerCase())
                expect(extension).not.toMatch(/^\./)
            }
        }
    })

    it('each entry has a non-empty one-line description (no embedded newlines)', () => {
        for (const h of BUILTIN_HELPERS) {
            expect(h.description.length).toBeGreaterThan(0)
            expect(h.description).not.toMatch(/\r|\n/)
        }
    })

    it('handles extension list contains no duplicates across the whole registry', () => {
        const seen = new Set<string>()
        for (const h of BUILTIN_HELPERS) {
            for (const { extension } of h.handles) {
                expect(seen.has(extension)).toBe(false)
                seen.add(extension)
            }
        }
    })
})

// ---------------------------------------------------------------------------
// Lazy load + memoisation — the registry must avoid touching disk until a
// caller asks for bytes, then cache so repeated reads are O(1).
// ---------------------------------------------------------------------------

describe('BuiltinHelper.bytes / digest / sizeBytes', () => {
    const helper = BUILTIN_HELPERS.find((h) => h.name === 'pdf_extract')!

    it('reads the script bytes from disk and they match the checked-in file', async () => {
        const bytes = await helper.bytes()
        const expected = await fs.readFile(path.join(__dirname, 'scripts', 'pdf_extract.py'))
        expect(bytes.equals(expected)).toBe(true)
    })

    it('returns the same Buffer instance on subsequent calls (memoised)', async () => {
        const a = await helper.bytes()
        const b = await helper.bytes()
        expect(a).toBe(b)
    })

    it('digest is a 64-char hex sha256 and stable across reads', async () => {
        const d1 = await helper.digest()
        const d2 = await helper.digest()
        expect(d1).toMatch(/^[a-f0-9]{64}$/)
        expect(d1).toBe(d2)
    })

    it('sizeBytes matches bytes().length', async () => {
        expect(await helper.sizeBytes()).toBe((await helper.bytes()).length)
    })
})

// ---------------------------------------------------------------------------
// builtinHelpersEnabled — single global env switch, default true.
// ---------------------------------------------------------------------------

describe('builtinHelpersEnabled', () => {
    it('defaults to true when SKILL_BUILTIN_HELPERS is unset', () => {
        expect(builtinHelpersEnabled({} as NodeJS.ProcessEnv)).toBe(true)
    })

    it('returns true for truthy values', () => {
        for (const v of ['1', 'true', 'TRUE', 'on', 'yes']) {
            expect(builtinHelpersEnabled({ SKILL_BUILTIN_HELPERS: v } as NodeJS.ProcessEnv)).toBe(true)
        }
    })

    it('returns false for documented false-ish values', () => {
        for (const v of ['0', 'false', 'FALSE', 'off', 'no']) {
            expect(builtinHelpersEnabled({ SKILL_BUILTIN_HELPERS: v } as NodeJS.ProcessEnv)).toBe(false)
        }
    })

    it('treats unparseable values as the default (true) so a typo never silently disables helpers', () => {
        expect(builtinHelpersEnabled({ SKILL_BUILTIN_HELPERS: 'maybe' } as NodeJS.ProcessEnv)).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// helpersFootprint — telemetry feed for the per-session "Materialized N
// helpers (B bytes)" log line.
// ---------------------------------------------------------------------------

describe('helpersFootprint', () => {
    it('returns zeroes for an empty list', async () => {
        expect(await helpersFootprint([])).toEqual({ count: 0, bytes: 0 })
    })

    it('sums sizeBytes across the registry', async () => {
        const fp = await helpersFootprint(BUILTIN_HELPERS)
        let manualBytes = 0
        for (const h of BUILTIN_HELPERS) manualBytes += await h.sizeBytes()
        expect(fp).toEqual({ count: BUILTIN_HELPERS.length, bytes: manualBytes })
        expect(fp.bytes).toBeGreaterThan(0)
    })
})
