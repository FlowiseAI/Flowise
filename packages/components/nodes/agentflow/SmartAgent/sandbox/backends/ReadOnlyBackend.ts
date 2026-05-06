import { BackendProtocol, EditResult, GlobResult, GrepResult, LsResult, ReadRawResult, ReadResult, WriteResult } from '../BackendProtocol'

export class ReadOnlyBackend implements BackendProtocol {
    constructor(private inner: BackendProtocol) {}

    ls(p: string): Promise<LsResult> {
        return this.inner.ls(p)
    }
    read(p: string, offset?: number, limit?: number): Promise<ReadResult> {
        return this.inner.read(p, offset, limit)
    }
    readRaw(p: string): Promise<ReadRawResult> {
        return this.inner.readRaw(p)
    }
    glob(pattern: string, basePath?: string): Promise<GlobResult> {
        return this.inner.glob(pattern, basePath)
    }
    grep(pattern: string, dirPath?: string | null, glob?: string | null): Promise<GrepResult> {
        return this.inner.grep(pattern, dirPath, glob)
    }
    async write(p: string, _content: string | Uint8Array): Promise<WriteResult> {
        return { error: `Cannot write to ${p}: read-only backend` }
    }
    async edit(p: string, _oldStr: string, _newStr: string, _replaceAll?: boolean): Promise<EditResult> {
        return { error: `Cannot edit ${p}: read-only backend` }
    }
}
