import { readFileSync } from 'fs'
import path from 'path'

/**
 * Minimum supported Node.js major version, used only as a fallback when the
 * `engines.node` field cannot be read from package.json. Keep in sync with the
 * `engines.node` declaration (currently `^24`).
 */
export const FALLBACK_MIN_NODE_MAJOR = 24

/**
 * Parse the major version number from a Node.js version string.
 * @param version e.g. "v24.1.0" or "24.1.0"
 * @returns the major version number, or null if it cannot be parsed
 */
export const parseMajor = (version: string): number | null => {
    const match = /^v?(\d+)\./.exec(String(version ?? '').trim())
    return match ? parseInt(match[1], 10) : null
}

/**
 * Parse the required major version from an `engines.node` range string.
 * Handles the common forms ("^24", ">=24.0.0", "24.x", "24"). Falls back to
 * {@link FALLBACK_MIN_NODE_MAJOR} when the range is missing or unparseable.
 * @param engines the `engines.node` value
 */
export const parseRequiredMajor = (engines: string | undefined): number => {
    if (!engines) return FALLBACK_MIN_NODE_MAJOR
    const match = /(\d+)/.exec(engines)
    return match ? parseInt(match[1], 10) : FALLBACK_MIN_NODE_MAJOR
}

/**
 * Read the required Node.js major version from this package's `engines.node`
 * field. Falls back to {@link FALLBACK_MIN_NODE_MAJOR} on any read/parse error
 * so the check can never throw.
 */
export const getRequiredNodeMajor = (): number => {
    try {
        const pkgPath = path.join(__dirname, '..', '..', 'package.json')
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        return parseRequiredMajor(pkg?.engines?.node)
    } catch {
        return FALLBACK_MIN_NODE_MAJOR
    }
}

/**
 * Whether the running Node.js version satisfies the required major version.
 * Fails open (returns true) when the current version cannot be parsed, so an
 * unexpected version format never blocks startup.
 */
export const isSupportedNodeVersion = (current: string, requiredMajor: number): boolean => {
    const major = parseMajor(current)
    if (major === null) return true
    return major >= requiredMajor
}

/**
 * Build the user-facing message shown when Node.js is too old. References the
 * exact symptom (`ReferenceError: File is not defined`) so users hitting the
 * raw crash can connect it to the version requirement.
 */
export const nodeVersionErrorMessage = (current: string, requiredMajor: number): string =>
    `Flowise requires Node.js >= ${requiredMajor}. You are running ${current}. ` +
    `Please upgrade Node.js (https://nodejs.org) and try again. ` +
    `Running on an unsupported version causes startup errors such as "ReferenceError: File is not defined".`

/**
 * Assert that the running Node.js version is supported.
 * @param current the running version string (defaults to `process.versions.node`)
 * @returns `{ ok: true }` when supported, otherwise `{ ok: false, message }`
 */
export const assertNodeVersion = (current: string = process.versions.node): { ok: boolean; message?: string } => {
    const requiredMajor = getRequiredNodeMajor()
    if (isSupportedNodeVersion(current, requiredMajor)) return { ok: true }
    return { ok: false, message: nodeVersionErrorMessage(current, requiredMajor) }
}
