/**
 * Sandbox — Layer 2: the base sandbox.
 *
 * Subclasses provide only four primitives — `id`, `execute`,
 * `uploadFiles`, `downloadFiles` — and inherit a full
 * `BackendProtocol` implementation (ls / read / readRaw / glob / grep
 * / write / edit) for free.
 *
 * Design rules (mirroring `docs/BASH_EXECUTION_ARCHITECTURE.md` §4):
 *
 *   1. **Pure POSIX, no runtime assumed.** Every command sent through
 *      `execute` must run on a minimal POSIX environment — `sh`, `awk`,
 *      `grep`, `find`, `stat`, `printf`. No Python/Node/etc. required.
 *   2. **Probe the environment at runtime, not at install time.**
 *      Subtle differences (GNU find vs. busybox find vs. BSD find) are
 *      detected *inside* the shell command itself, not by configuring
 *      the backend up front. All branches emit the same output format
 *      so the in-process parser stays host-agnostic.
 *   3. **Shell only what shell is good at.** Reading file *content*
 *      (especially with offsets) goes through shell — `awk 'NR>=s &&
 *      NR<=e'` returns only the requested slice over the wire. Writing
 *      and editing never go through shell; they use the binary-safe
 *      file transfer methods directly.
 *   4. **Quote everything.** Any user-controlled string interpolated
 *      into a shell command is wrapped with POSIX single-quote escaping
 *      via `quote(s)`. No public API accepts an unquoted string.
 */

import {
    BackendProtocol,
    EditResult,
    ExecuteResponse,
    FileDownloadResponse,
    FileUploadResponse,
    GlobResult,
    GrepHit,
    GrepResult,
    LsEntry,
    LsResult,
    MaybePromise,
    ReadRawResult,
    ReadResult,
    SandboxBackendProtocol,
    SandboxFileTransfer,
    WriteResult
} from './types'

// ---------------------------------------------------------------------------
// POSIX single-quote escaping (Architecture §4, Rule 4)
// ---------------------------------------------------------------------------

/**
 * Wrap `s` in single quotes and escape embedded single quotes per POSIX
 * (`'\''`). Always emits a quoted token so the caller can interpolate
 * directly into a shell command without a separate escaping step.
 *
 * Examples:
 *   quote("foo")        → "'foo'"
 *   quote("don't")      → "'don'\\''t'"
 *   quote("a b'c d")    → "'a b'\\''c d'"
 */
export const quote = (s: string): string => "'" + s.replace(/'/g, `'\\''`) + "'"

// ---------------------------------------------------------------------------
// Shell-output line markers — exported so adapters that wrap stderr can
// produce identical byte patterns.
// ---------------------------------------------------------------------------

/** Sentinel that separates the host-probe output from the payload output. */
const PROBE_SENTINEL = '__SANDBOX_PROBE_OK__'

/** Field separator used in the listing probe output. */
const LS_FS = '\u0001'

// ---------------------------------------------------------------------------
// BaseSandbox
// ---------------------------------------------------------------------------

export abstract class BaseSandbox implements SandboxBackendProtocol, SandboxFileTransfer {
    abstract readonly id: string
    abstract execute(command: string): MaybePromise<ExecuteResponse>
    abstract uploadFiles(files: Array<[string, Uint8Array]>): MaybePromise<FileUploadResponse[]>
    abstract downloadFiles(paths: string[]): MaybePromise<FileDownloadResponse[]>

    // -----------------------------------------------------------------------
    // ls — host-portable directory listing
    // -----------------------------------------------------------------------

    /**
     * List the entries directly under `path`. Probes for GNU `find
     * -printf`, busybox `stat -c`, and BSD/macOS `stat -f` so the same
     * driver works against every common base image.
     */
    async ls(path: string): Promise<LsResult> {
        const qPath = quote(path)
        const FS = LS_FS
        // Three branches; each prints lines of the form
        //   <type>\u0001<size>\u0001<mtime>\u0001<name>
        // followed by a final PROBE_SENTINEL.
        const cmd = [
            `if [ ! -e ${qPath} ]; then echo "__NOT_FOUND__"; exit 0; fi`,
            `if [ ! -d ${qPath} ]; then echo "__NOT_DIR__"; exit 0; fi`,
            `cd ${qPath} || exit 0`,
            // GNU find supports -printf.
            `if find . -maxdepth 0 -printf "" >/dev/null 2>&1; then`,
            `  find . -mindepth 1 -maxdepth 1 -printf "%y${FS}%s${FS}%T@${FS}%f\\n" 2>/dev/null`,
            // busybox-compatible stat -c.
            `elif stat -c "%s" /dev/null >/dev/null 2>&1; then`,
            `  for n in * .[!.]* ..?*; do`,
            `    [ -e "$n" ] || continue`,
            `    t=$(if [ -L "$n" ]; then echo l; elif [ -d "$n" ]; then echo d; elif [ -f "$n" ]; then echo f; else echo u; fi)`,
            `    sz=$(stat -c "%s" "$n" 2>/dev/null || echo 0)`,
            `    mt=$(stat -c "%Y" "$n" 2>/dev/null || echo 0)`,
            `    printf "%s${FS}%s${FS}%s${FS}%s\\n" "$t" "$sz" "$mt" "$n"`,
            `  done`,
            // BSD/macOS stat -f.
            `else`,
            `  for n in * .[!.]* ..?*; do`,
            `    [ -e "$n" ] || continue`,
            `    t=$(if [ -L "$n" ]; then echo l; elif [ -d "$n" ]; then echo d; elif [ -f "$n" ]; then echo f; else echo u; fi)`,
            `    sz=$(stat -f "%z" "$n" 2>/dev/null || echo 0)`,
            `    mt=$(stat -f "%m" "$n" 2>/dev/null || echo 0)`,
            `    printf "%s${FS}%s${FS}%s${FS}%s\\n" "$t" "$sz" "$mt" "$n"`,
            `  done`,
            `fi`,
            `echo ${PROBE_SENTINEL}`
        ].join('\n')

        const r = await this.execute(cmd)
        if (r.exitCode !== 0 && r.exitCode !== null) {
            return { path, entries: [], error: `ls failed: ${truncate(r.output, 256)}` }
        }
        const text = r.output || ''
        if (text.includes('__NOT_FOUND__')) {
            return { path, entries: [], error: 'file_not_found' }
        }
        if (text.includes('__NOT_DIR__')) {
            return { path, entries: [], error: 'is_not_a_directory' }
        }
        const entries: LsEntry[] = []
        const lines = text.split(/\r?\n/)
        const base = path.endsWith('/') ? path : `${path}/`
        for (const line of lines) {
            if (!line || line === PROBE_SENTINEL) continue
            const parts = line.split(FS)
            if (parts.length < 4) continue
            const [tRaw, sRaw, mRaw, ...nameParts] = parts
            const name = nameParts.join(FS)
            // Skip the GNU `find . -mindepth 1` "./" prefixed entries.
            const cleanName = name.startsWith('./') ? name.slice(2) : name
            if (!cleanName || cleanName === '.' || cleanName === '..') continue
            const size = Number.parseInt(sRaw, 10)
            const mtime = Number.parseFloat(mRaw)
            entries.push({
                name: cleanName,
                path: `${base}${cleanName}`,
                type: parseLsType(tRaw),
                size: Number.isFinite(size) ? size : undefined,
                mtime: Number.isFinite(mtime) ? mtime : undefined
            })
        }
        return { path, entries }
    }

    // -----------------------------------------------------------------------
    // read — slice large files at the source
    // -----------------------------------------------------------------------

    /**
     * Read (a slice of) a text file. When `offset` / `limit` are given,
     * uses `awk 'NR>=s && NR<=e'` so only the requested lines come back
     * over the wire — critical for large files on remote sandboxes.
     */
    async read(path: string, offset?: number, limit?: number): Promise<ReadResult> {
        const qPath = quote(path)
        const checks = [
            `if [ ! -e ${qPath} ]; then echo "__NOT_FOUND__"; exit 0; fi`,
            `if [ -d ${qPath} ]; then echo "__IS_DIR__"; exit 0; fi`,
            `if [ ! -r ${qPath} ]; then echo "__PERMISSION_DENIED__"; exit 0; fi`
        ].join('\n')

        if (typeof offset === 'number' || typeof limit === 'number') {
            const s = Math.max(1, Math.floor(offset ?? 1))
            const lim = typeof limit === 'number' && limit > 0 ? Math.floor(limit) : Number.MAX_SAFE_INTEGER
            const e = lim === Number.MAX_SAFE_INTEGER ? lim : s + lim - 1
            const cmd = [
                checks,
                `awk -v s=${s} -v e=${e} 'NR>=s && NR<=e' ${qPath}`,
                `printf "\\n${PROBE_SENTINEL}\\n"`,
                `wc -l < ${qPath}`
            ].join('\n')
            const r = await this.execute(cmd)
            if (r.exitCode !== 0 && r.exitCode !== null) {
                return { path, content: null, error: `read failed: ${truncate(r.output, 256)}` }
            }
            const err = classifyReadProbe(r.output)
            if (err) return { path, content: null, error: err }
            // Split off the wc total which follows the PROBE_SENTINEL.
            const idx = r.output.indexOf(PROBE_SENTINEL)
            const body = idx >= 0 ? r.output.slice(0, idx) : r.output
            const tailRaw = idx >= 0 ? r.output.slice(idx + PROBE_SENTINEL.length).trim() : ''
            const total = Number.parseInt(tailRaw, 10)
            // Strip the trailing newline we injected before the sentinel.
            const content = body.endsWith('\n') ? body.slice(0, -1) : body
            return {
                path,
                content,
                offset: s,
                limit: lim === Number.MAX_SAFE_INTEGER ? undefined : lim,
                totalLines: Number.isFinite(total) ? total : undefined
            }
        }

        const cmd = [checks, `cat ${qPath}`, `printf "\\n${PROBE_SENTINEL}\\n"`, `wc -l < ${qPath}`].join('\n')
        const r = await this.execute(cmd)
        if (r.exitCode !== 0 && r.exitCode !== null) {
            return { path, content: null, error: `read failed: ${truncate(r.output, 256)}` }
        }
        const err = classifyReadProbe(r.output)
        if (err) return { path, content: null, error: err }
        const idx = r.output.indexOf(PROBE_SENTINEL)
        const body = idx >= 0 ? r.output.slice(0, idx) : r.output
        const tailRaw = idx >= 0 ? r.output.slice(idx + PROBE_SENTINEL.length).trim() : ''
        const total = Number.parseInt(tailRaw, 10)
        const content = body.endsWith('\n') ? body.slice(0, -1) : body
        return { path, content, totalLines: Number.isFinite(total) ? total : undefined }
    }

    // -----------------------------------------------------------------------
    // readRaw — binary-safe via downloadFiles
    // -----------------------------------------------------------------------

    async readRaw(path: string): Promise<ReadRawResult> {
        const [resp] = await this.downloadFiles([path])
        if (!resp) {
            return { path, content: null, error: 'file_not_found' }
        }
        if (resp.error) {
            return { path, content: null, error: resp.error }
        }
        return { path, content: resp.content }
    }

    // -----------------------------------------------------------------------
    // write — go through file-transfer, never the shell
    // -----------------------------------------------------------------------

    async write(path: string, content: string): Promise<WriteResult> {
        // Check existence first so we can report `overwrote`.
        const qPath = quote(path)
        const existed = await this.execute(`if [ -e ${qPath} ]; then echo Y; else echo N; fi`)
        const overwrote = existed.output.trim().startsWith('Y')
        const bytes = Buffer.from(content, 'utf8')
        const [resp] = await this.uploadFiles([[path, new Uint8Array(bytes)]])
        if (!resp) {
            return { path, error: 'io_error' }
        }
        if (resp.error) {
            return { path, error: resp.error }
        }
        return { path, bytesWritten: bytes.length, overwrote }
    }

    // -----------------------------------------------------------------------
    // edit — in-process diff via downloadFiles + uploadFiles
    // -----------------------------------------------------------------------

    async edit(path: string, oldString: string, newString: string, replaceAll = false): Promise<EditResult> {
        const [resp] = await this.downloadFiles([path])
        if (!resp) return { path, replacements: 0, error: 'file_not_found' }
        if (resp.error) return { path, replacements: 0, error: resp.error }
        if (!resp.content) return { path, replacements: 0, error: 'file_not_found' }
        const original = Buffer.from(resp.content).toString('utf8')
        let next: string
        let count: number
        if (replaceAll) {
            count = countOccurrences(original, oldString)
            next = oldString === '' ? original : original.split(oldString).join(newString)
        } else {
            const idx = original.indexOf(oldString)
            if (idx < 0) {
                return { path, replacements: 0, error: 'old_string_not_found' }
            }
            next = original.slice(0, idx) + newString + original.slice(idx + oldString.length)
            count = 1
        }
        if (count === 0) {
            return { path, replacements: 0, error: 'old_string_not_found' }
        }
        const bytes = Buffer.from(next, 'utf8')
        const [up] = await this.uploadFiles([[path, new Uint8Array(bytes)]])
        if (!up) return { path, replacements: 0, error: 'io_error' }
        if (up.error) return { path, replacements: 0, error: up.error }
        return { path, replacements: count }
    }

    // -----------------------------------------------------------------------
    // glob — find ... + in-process glob-to-regex match
    // -----------------------------------------------------------------------

    async glob(pattern: string, path?: string): Promise<GlobResult> {
        const root = path ?? '.'
        const qRoot = quote(root)
        // We use `find` to enumerate everything under root, then filter
        // against `pattern` in-process. This keeps the shell side trivial
        // (one POSIX-portable invocation) and the glob semantics
        // host-independent.
        const cmd = [
            `if [ ! -d ${qRoot} ]; then echo "__NOT_DIR__"; exit 0; fi`,
            `find ${qRoot} -type f 2>/dev/null`,
            `echo ${PROBE_SENTINEL}`
        ].join('\n')
        const r = await this.execute(cmd)
        if (r.exitCode !== 0 && r.exitCode !== null) {
            return { pattern, path: root, matches: [], error: `glob failed: ${truncate(r.output, 256)}` }
        }
        if (r.output.includes('__NOT_DIR__')) {
            return { pattern, path: root, matches: [], error: 'is_not_a_directory' }
        }
        const re = globToRegex(pattern)
        const matches: string[] = []
        for (const line of r.output.split(/\r?\n/)) {
            if (!line || line === PROBE_SENTINEL) continue
            // Match against the basename and the path relative to root —
            // either match counts so callers can use either '**/*.json'
            // or 'foo*' style patterns.
            const base = line.split('/').pop() || line
            if (re.test(line) || re.test(base)) {
                matches.push(line)
            }
        }
        return { pattern, path: root, matches }
    }

    // -----------------------------------------------------------------------
    // grep — `grep -nE` with a per-host probe for recursion
    // -----------------------------------------------------------------------

    async grep(pattern: string, path?: string, glob?: string | null): Promise<GrepResult> {
        const target = path ?? '.'
        const qTarget = quote(target)
        const qPat = quote(pattern)
        const qGlob = glob ? quote(glob) : null
        const includeArg = qGlob ? `--include=${qGlob}` : ''
        // `grep -rnE` is supported by GNU, busybox, and BSD/macOS grep
        // (BSD added -r in 2008). The `-H` flag forces "path:" prefixing
        // on every hit even when grep is given a single file, so single-
        // file searches surface a path the parser can read.
        const cmd = [
            `if [ ! -e ${qTarget} ]; then echo "__NOT_FOUND__"; exit 0; fi`,
            `if [ -d ${qTarget} ]; then`,
            `  grep -rnHE ${includeArg} ${qPat} ${qTarget} 2>/dev/null`,
            `else`,
            `  grep -nHE ${qPat} ${qTarget} 2>/dev/null`,
            `fi`,
            `echo ${PROBE_SENTINEL}`
        ].join('\n')
        const r = await this.execute(cmd)
        if (r.exitCode !== 0 && r.exitCode !== null) {
            return { pattern, path: target, hits: [], error: `grep failed: ${truncate(r.output, 256)}` }
        }
        if (r.output.includes('__NOT_FOUND__')) {
            return { pattern, path: target, hits: [], error: 'file_not_found' }
        }
        const hits: GrepHit[] = []
        for (const line of r.output.split(/\r?\n/)) {
            if (!line || line === PROBE_SENTINEL) continue
            // Lines come back as either `path:line:text` (recursive) or
            // `line:text` (single file). Parse both.
            const m = line.match(/^([^:]+):(\d+):(.*)$/)
            if (m) {
                hits.push({ path: m[1], line: Number.parseInt(m[2], 10), text: m[3] })
                continue
            }
            const m2 = line.match(/^(\d+):(.*)$/)
            if (m2) {
                hits.push({ path: target, line: Number.parseInt(m2[1], 10), text: m2[2] })
            }
        }
        return { pattern, path: target, hits }
    }
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const parseLsType = (raw: string): LsEntry['type'] => {
    switch (raw) {
        case 'f':
            return 'file'
        case 'd':
            return 'dir'
        case 'l':
            return 'symlink'
        default:
            return 'unknown'
    }
}

const classifyReadProbe = (output: string): string | null => {
    if (output.includes('__NOT_FOUND__')) return 'file_not_found'
    if (output.includes('__IS_DIR__')) return 'is_directory'
    if (output.includes('__PERMISSION_DENIED__')) return 'permission_denied'
    return null
}

const truncate = (s: string, max: number): string => (s.length <= max ? s : `${s.slice(0, max)}…`)

const countOccurrences = (haystack: string, needle: string): number => {
    if (needle === '') return 0
    let n = 0
    let i = 0
    while ((i = haystack.indexOf(needle, i)) !== -1) {
        n += 1
        i += needle.length
    }
    return n
}

/**
 * Tiny glob → regex translator. Supports `*`, `?`, `**` (matches any
 * path segment), `[...]` character classes, and brace alternation
 * `{a,b,c}`. Deliberately minimal — the model gets the structured
 * `glob` tool for richer queries.
 */
const globToRegex = (pattern: string): RegExp => {
    let i = 0
    let out = ''
    while (i < pattern.length) {
        const c = pattern[i]
        if (c === '*') {
            if (pattern[i + 1] === '*') {
                out += '.*'
                i += 2
                continue
            }
            out += '[^/]*'
            i += 1
            continue
        }
        if (c === '?') {
            out += '[^/]'
            i += 1
            continue
        }
        if (c === '.' || c === '(' || c === ')' || c === '+' || c === '|' || c === '^' || c === '$' || c === '\\') {
            out += '\\' + c
            i += 1
            continue
        }
        if (c === '[') {
            const end = pattern.indexOf(']', i)
            if (end === -1) {
                out += '\\['
                i += 1
                continue
            }
            out += pattern.slice(i, end + 1)
            i = end + 1
            continue
        }
        if (c === '{') {
            const end = pattern.indexOf('}', i)
            if (end === -1) {
                out += '\\{'
                i += 1
                continue
            }
            const inner = pattern.slice(i + 1, end)
            out +=
                '(?:' +
                inner
                    .split(',')
                    .map((s) => s.trim())
                    .join('|') +
                ')'
            i = end + 1
            continue
        }
        out += c
        i += 1
    }
    return new RegExp(`^${out}$`)
}

// Re-export so callers can use `BackendProtocol` directly without
// importing twice.
export type { BackendProtocol }
