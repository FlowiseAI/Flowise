import { BackendProtocol, DEFAULT_READ_LIMIT, FileData, FilesUpdate, ReadResult, WriteResult } from '../BackendProtocol'
import { getMimeType, isTextMimeType, paginateLines } from '../utils'

type FileStore = Record<string, FileData>

// TODO: Will be implemented in later stages.
const NOT_IMPL = 'not implemented yet'

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
        if (!file) return { error: `File not found: ${filePath}` }
        if (!isTextMimeType(file.mimeType)) {
            return { content: file.content as Uint8Array, mimeType: file.mimeType }
        }

        return { content: paginateLines(file.content as string, offset, limit), mimeType: file.mimeType }
    }

    // TODO: Will be implemented in later stages.
    ls(_p: string): Promise<never> {
        throw new Error(NOT_IMPL)
    }
    readRaw(_p: string): Promise<never> {
        throw new Error(NOT_IMPL)
    }
    edit(_p: string, _o: string, _n: string, _a?: boolean): Promise<never> {
        throw new Error(NOT_IMPL)
    }
    grep(_p: string, _path?: string | null, _g?: string | null): Promise<never> {
        throw new Error(NOT_IMPL)
    }
    glob(_p: string, _path?: string): Promise<never> {
        throw new Error(NOT_IMPL)
    }
}
