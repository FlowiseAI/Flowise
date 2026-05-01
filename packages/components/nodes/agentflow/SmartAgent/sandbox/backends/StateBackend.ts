import {
    BackendProtocol,
    DEFAULT_READ_LIMIT,
    EditResult,
    FileData,
    FileInfo,
    FilesUpdate,
    GlobResult,
    GrepMatch,
    GrepResult,
    LsResult,
    ReadRawResult,
    ReadResult,
    WriteResult
} from '../BackendProtocol'
import { escapeRegex, getMimeType, globToRegex, isTextMimeType, paginateLines } from '../utils'

type FileStore = Record<string, FileData>

export class StateBackend implements BackendProtocol {
    protected files: FileStore

    constructor(initialFiles: FileStore = {}) {
        this.files = { ...initialFiles }
    }

    async write(filePath: string, content: string | Uint8Array): Promise<WriteResult> {
        if (this.files[filePath]) {
            return { error: `Cannot write to ${filePath} because it already exists.` }
        }
        const mimeType = getMimeType(filePath)
        const now = Date.now()
        const data: FileData = { content, mimeType, created_at: now, modified_at: now }
        this.files[filePath] = data
        const filesUpdate: FilesUpdate = { [filePath]: data }

        return { path: filePath, filesUpdate }
    }

    async read(filePath: string, offset = 0, limit = DEFAULT_READ_LIMIT): Promise<ReadResult> {
        const file = this.files[filePath]
        if (!file) {
            return { error: `File not found: ${filePath}` }
        }
        if (!isTextMimeType(file.mimeType)) {
            return { content: file.content as Uint8Array, mimeType: file.mimeType }
        }
        const { content: paginated, truncated } = paginateLines(file.content as string, offset, limit)

        return { content: paginated, mimeType: file.mimeType, truncated }
    }

    async readRaw(filePath: string): Promise<ReadRawResult> {
        const file = this.files[filePath]
        if (!file) {
            return { error: `File not found: ${filePath}` }
        }

        return { data: file }
    }

    async edit(filePath: string, oldStr: string, newStr: string, replaceAll = false): Promise<EditResult> {
        const file = this.files[filePath]
        if (!file) {
            return { error: `File not found: ${filePath}` }
        }
        if (!isTextMimeType(file.mimeType)) {
            return { error: `Cannot edit binary file: ${filePath}` }
        }

        const content = file.content as string
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
        const newData: FileData = { ...file, content: updated, modified_at: Date.now() }
        this.files[filePath] = newData
        const filesUpdate: FilesUpdate = { [filePath]: newData }

        return { path: filePath, occurrences, filesUpdate }
    }

    async ls(dirPath: string): Promise<LsResult> {
        const normalized = dirPath === '/' ? '/' : dirPath.endsWith('/') ? dirPath : dirPath + '/'
        const seen = new Set<string>()
        const files: FileInfo[] = []

        for (const [key, data] of Object.entries(this.files)) {
            if (!key.startsWith(normalized)) continue
            const remaining = key.slice(normalized.length)
            if (!remaining) continue
            const firstSegment = remaining.split('/')[0]
            if (seen.has(firstSegment)) continue
            seen.add(firstSegment)
            const isDirectory = remaining.includes('/')
            files.push({
                name: firstSegment,
                path: normalized + firstSegment,
                size: isDirectory ? 0 : data.content.length,
                isDirectory,
                mimeType: isDirectory ? undefined : data.mimeType
            })
        }
        files.sort((a, b) => a.name.localeCompare(b.name))

        return { files }
    }

    async glob(pattern: string, basePath = '/'): Promise<GlobResult> {
        const regex = globToRegex(pattern)
        const normalized = basePath === '/' ? '/' : basePath.endsWith('/') ? basePath : basePath + '/'
        const files: FileInfo[] = []

        for (const [key, data] of Object.entries(this.files)) {
            if (!key.startsWith(normalized)) continue
            const relative = key.slice(normalized.length)
            if (!relative) continue
            if (!regex.test(relative)) continue
            files.push({
                name: relative.split('/').pop() ?? relative,
                path: key,
                size: data.content.length,
                isDirectory: false,
                mimeType: data.mimeType
            })
        }
        files.sort((a, b) => a.path.localeCompare(b.path))

        return { files, truncated: false }
    }

    async grep(pattern: string, dirPath: string | null = '/', glob: string | null = null): Promise<GrepResult> {
        let regex: RegExp
        try {
            regex = new RegExp(pattern)
        } catch {
            return { error: `Invalid regex pattern: ${pattern}` }
        }
        const globRx = glob ? globToRegex(glob) : null
        const basePath = dirPath ?? '/'
        const normalized = basePath === '/' ? '/' : basePath.endsWith('/') ? basePath : basePath + '/'
        const matches: GrepMatch[] = []

        for (const [key, data] of Object.entries(this.files)) {
            if (!key.startsWith(normalized)) continue
            if (!isTextMimeType(data.mimeType)) continue
            if (globRx) {
                const basename = key.split('/').pop() ?? key
                if (!globRx.test(basename)) continue
            }
            const lines = (data.content as string).split('\n')
            for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                    matches.push({ path: key, line: i + 1, content: lines[i] })
                }
            }
        }

        return { matches, truncated: false }
    }
}
