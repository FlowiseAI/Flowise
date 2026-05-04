import { mkdirSync, type Dirent, type Stats } from 'node:fs'
import fs from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import {
    BackendProtocol,
    DEFAULT_READ_LIMIT,
    EditResult,
    FileInfo,
    GlobResult,
    GrepMatch,
    GrepResult,
    LsResult,
    MAX_LIST_OBJECTS,
    ReadRawResult,
    ReadResult,
    WriteResult
} from '../BackendProtocol'
import { escapeRegex, getMimeType, globToRegex, isTextMimeType, paginateLines } from '../utils'

/**
 * Disk-backed `BackendProtocol` implementation for development.
 *
 * Files live on the host filesystem under a configurable `rootPath`. Path
 * traversal (`../`) is rejected; deliberately-crafted symlinks pointing
 * outside `rootPath` are NOT detected (uses `fs.stat`). For strict
 * containment, wrap with `fs.realpath` checks — left out here for simplicity.
 *
 * @remarks
 * **Dev-only.** No isolation from the host filesystem beyond `rootPath`.
 * Do not enable in production. The host process can read/write anything
 * under `rootPath` as the OS user running the app.
 */
export class LocalBackend implements BackendProtocol {
    protected root: string

    constructor(rootPath?: string) {
        this.root = path.resolve(rootPath || path.join(homedir(), '.flowise', 'sandbox'))
        mkdirSync(this.root, { recursive: true })
    }

    /**
     * Resolve a virtual `/`-rooted path under `this.root`. Returns `null` if
     * the resolved absolute path escapes the root (e.g. via `../`).
     */
    protected resolveSafe(filePath: string): string | null {
        const relative = filePath.replace(/^\/+/, '')
        const abs = path.resolve(this.root, relative)
        if (abs !== this.root && !abs.startsWith(this.root + path.sep)) return null
        return abs
    }

    /** Convert an absolute on-disk path back to a virtual `/`-rooted POSIX path. */
    protected toVirtual(abs: string): string {
        const rel = path.relative(this.root, abs).split(path.sep).join('/')
        return rel ? '/' + rel : '/'
    }

    async write(filePath: string, content: string | Uint8Array): Promise<WriteResult> {
        const abs = this.resolveSafe(filePath)
        if (!abs) return { error: `Path traversal rejected: ${filePath}` }
        await fs.mkdir(path.dirname(abs), { recursive: true })
        try {
            await fs.writeFile(abs, content, { flag: 'wx' })
        } catch (e) {
            if (e?.code === 'EEXIST' || e?.code === 'EISDIR') {
                return { error: `Cannot write to ${filePath} because it already exists.` }
            }
            throw e
        }
        return { path: filePath, filesUpdate: null }
    }

    async read(filePath: string, offset = 0, limit = DEFAULT_READ_LIMIT): Promise<ReadResult> {
        const abs = this.resolveSafe(filePath)
        if (!abs) return { error: `Path traversal rejected: ${filePath}` }
        let buf: Buffer
        try {
            buf = await fs.readFile(abs)
        } catch {
            return { error: `File not found: ${filePath}` }
        }
        const mimeType = getMimeType(filePath)
        if (!isTextMimeType(mimeType)) {
            return { content: new Uint8Array(buf), mimeType }
        }
        const { content, truncated } = paginateLines(buf.toString('utf8'), offset, limit)
        return { content, mimeType, truncated }
    }

    async readRaw(filePath: string): Promise<ReadRawResult> {
        const abs = this.resolveSafe(filePath)
        if (!abs) return { error: `Path traversal rejected: ${filePath}` }
        let buf: Buffer
        let stat: Stats
        try {
            buf = await fs.readFile(abs)
            stat = await fs.stat(abs)
        } catch {
            return { error: `File not found: ${filePath}` }
        }
        const mimeType = getMimeType(filePath)
        return {
            data: {
                content: isTextMimeType(mimeType) ? buf.toString('utf8') : new Uint8Array(buf),
                mimeType,
                created_at: stat.birthtimeMs || stat.mtimeMs,
                modified_at: stat.mtimeMs
            }
        }
    }

    async edit(filePath: string, oldStr: string, newStr: string, replaceAll = false): Promise<EditResult> {
        const abs = this.resolveSafe(filePath)
        if (!abs) return { error: `Path traversal rejected: ${filePath}` }
        const mimeType = getMimeType(filePath)
        if (!isTextMimeType(mimeType)) {
            return { error: `Cannot edit binary file: ${filePath}` }
        }
        let content: string
        try {
            content = await fs.readFile(abs, 'utf8')
        } catch {
            return { error: `File not found: ${filePath}` }
        }
        const matches = content.match(new RegExp(escapeRegex(oldStr), 'g'))
        const occurrences = matches ? matches.length : 0
        if (occurrences === 0) {
            return { error: `String not found in ${filePath}` }
        }
        if (occurrences > 1 && !replaceAll) {
            return {
                error: `Found ${occurrences} occurrences of the string in ${filePath}. Pass replaceAll=true to replace all, or provide a more specific oldStr.`
            }
        }
        const updated = replaceAll ? content.replaceAll(oldStr, newStr) : content.replace(oldStr, newStr)
        await fs.writeFile(abs, updated, 'utf8')
        return { path: filePath, occurrences, filesUpdate: null }
    }

    async ls(dirPath: string): Promise<LsResult> {
        const abs = this.resolveSafe(dirPath)
        if (!abs) return { error: `Path traversal rejected: ${dirPath}` }
        let entries: Dirent[]
        try {
            entries = await fs.readdir(abs, { withFileTypes: true })
        } catch {
            return { files: [] }
        }
        const normalized = dirPath === '/' ? '/' : dirPath.endsWith('/') ? dirPath : dirPath + '/'
        const files: FileInfo[] = await Promise.all(
            entries.map(async (entry) => {
                const entryAbs = path.join(abs, entry.name)
                const stat = await fs.stat(entryAbs).catch(() => null)
                const isDirectory = stat?.isDirectory() ?? entry.isDirectory()
                return {
                    name: entry.name,
                    path: normalized + entry.name,
                    size: isDirectory ? 0 : stat?.size ?? 0,
                    isDirectory,
                    mimeType: isDirectory ? undefined : getMimeType(entry.name)
                }
            })
        )
        files.sort((a, b) => a.name.localeCompare(b.name))
        return { files }
    }

    async glob(pattern: string, basePath = '/'): Promise<GlobResult> {
        const absBase = this.resolveSafe(basePath)
        if (!absBase) return { error: `Path traversal rejected: ${basePath}` }
        const regex = globToRegex(pattern)
        const normalized = basePath === '/' ? '/' : basePath.endsWith('/') ? basePath : basePath + '/'
        let entries: Dirent[]
        try {
            entries = await fs.readdir(absBase, { withFileTypes: true, recursive: true })
        } catch {
            return { files: [], truncated: false }
        }
        const files: FileInfo[] = []
        let truncated = false
        for (const entry of entries) {
            if (entry.isDirectory()) continue
            const entryAbs = path.join((entry as Dirent & { parentPath: string }).parentPath, entry.name)
            const relative = path.relative(absBase, entryAbs).split(path.sep).join('/')
            if (!regex.test(relative)) continue
            if (files.length >= MAX_LIST_OBJECTS) {
                truncated = true
                break
            }
            const stat = await fs.stat(entryAbs).catch(() => null)
            files.push({
                name: entry.name,
                path: normalized === '/' ? '/' + relative : normalized + relative,
                size: stat?.size ?? 0,
                isDirectory: false,
                mimeType: getMimeType(entry.name)
            })
        }
        return { files, truncated }
    }

    async grep(pattern: string, dirPath: string | null = '/', glob: string | null = null): Promise<GrepResult> {
        const basePath = dirPath ?? '/'
        const absBase = this.resolveSafe(basePath)
        if (!absBase) return { error: `Path traversal rejected: ${basePath}` }
        let regex: RegExp
        try {
            regex = new RegExp(pattern)
        } catch {
            return { error: `Invalid regex pattern: ${pattern}` }
        }
        const globRx = glob ? globToRegex(glob) : null
        let entries: Dirent[]
        try {
            entries = await fs.readdir(absBase, { withFileTypes: true, recursive: true })
        } catch {
            return { matches: [], truncated: false }
        }
        const matches: GrepMatch[] = []
        let scanned = 0
        let truncated = false
        for (const entry of entries) {
            if (entry.isDirectory()) continue
            if (scanned >= MAX_LIST_OBJECTS) {
                truncated = true
                break
            }
            const entryAbs = path.join((entry as Dirent & { parentPath: string }).parentPath, entry.name)
            const mimeType = getMimeType(entry.name)
            if (!isTextMimeType(mimeType)) continue
            if (globRx && !globRx.test(entry.name)) continue
            scanned++
            const content = await fs.readFile(entryAbs, 'utf8').catch(() => null)
            if (content === null) continue
            const relative = path.relative(this.root, entryAbs).split(path.sep).join('/')
            const lines = content.split('\n')
            for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                    matches.push({ path: '/' + relative, line: i + 1, content: lines[i] })
                }
            }
        }
        return { matches, truncated }
    }
}
