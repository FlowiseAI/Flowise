import {
    BackendProtocol,
    EditResult,
    FilesUpdate,
    GlobResult,
    GrepResult,
    LsResult,
    ReadRawResult,
    ReadResult,
    WriteResult
} from '../BackendProtocol'

interface Route {
    prefix: string
    backend: BackendProtocol
}

export class CompositeBackend implements BackendProtocol {
    private default_: BackendProtocol
    private routes: Route[]

    constructor(default_: BackendProtocol, routes: Record<string, BackendProtocol> = {}) {
        this.default_ = default_
        this.routes = Object.entries(routes)
            .map(([rawPrefix, backend]) => {
                if (rawPrefix === '' || rawPrefix === '/') {
                    throw new Error(`Invalid route prefix: ${JSON.stringify(rawPrefix)}`)
                }
                const prefix = rawPrefix.endsWith('/') ? rawPrefix : rawPrefix + '/'
                return { prefix, backend }
            })
            .sort((a, b) => b.prefix.length - a.prefix.length)
    }

    private resolve(filePath: string): { backend: BackendProtocol; prefix: string } {
        for (const r of this.routes) {
            if (filePath.startsWith(r.prefix) || filePath === r.prefix.slice(0, -1)) {
                return { backend: r.backend, prefix: r.prefix }
            }
        }
        return { backend: this.default_, prefix: '' }
    }

    private translateIn(filePath: string, prefix: string): string {
        if (!prefix) return filePath
        return '/' + filePath.slice(prefix.length)
    }

    private translateOut(subPath: string, prefix: string): string {
        if (!prefix) return subPath
        return prefix + subPath.slice(1)
    }

    private rekeyFilesUpdate(update: FilesUpdate | null, prefix: string): FilesUpdate | null {
        if (update === null || !prefix) return update
        const rekeyed: FilesUpdate = {}
        for (const [key, value] of Object.entries(update)) {
            rekeyed[this.translateOut(key, prefix)] = value
        }
        return rekeyed
    }

    async ls(dirPath: string): Promise<LsResult> {
        const { backend, prefix } = this.resolve(dirPath)
        const result = await backend.ls(this.translateIn(dirPath, prefix))
        if ('error' in result) return result
        return {
            files: result.files.map((f) => ({ ...f, path: this.translateOut(f.path, prefix) }))
        }
    }

    async read(filePath: string, offset?: number, limit?: number): Promise<ReadResult> {
        const { backend, prefix } = this.resolve(filePath)
        return backend.read(this.translateIn(filePath, prefix), offset, limit)
    }

    async readRaw(filePath: string): Promise<ReadRawResult> {
        const { backend, prefix } = this.resolve(filePath)
        return backend.readRaw(this.translateIn(filePath, prefix))
    }

    async write(filePath: string, content: string | Uint8Array): Promise<WriteResult> {
        const { backend, prefix } = this.resolve(filePath)
        const result = await backend.write(this.translateIn(filePath, prefix), content)
        if ('error' in result) return result
        return {
            path: this.translateOut(result.path, prefix),
            filesUpdate: this.rekeyFilesUpdate(result.filesUpdate, prefix)
        }
    }

    async edit(filePath: string, oldStr: string, newStr: string, replaceAll = false): Promise<EditResult> {
        const { backend, prefix } = this.resolve(filePath)
        const result = await backend.edit(this.translateIn(filePath, prefix), oldStr, newStr, replaceAll)
        if ('error' in result) return result
        return {
            path: this.translateOut(result.path, prefix),
            occurrences: result.occurrences,
            filesUpdate: this.rekeyFilesUpdate(result.filesUpdate, prefix)
        }
    }

    async glob(pattern: string, basePath = '/'): Promise<GlobResult> {
        const { backend, prefix } = this.resolve(basePath)
        const result = await backend.glob(pattern, this.translateIn(basePath, prefix))
        if ('error' in result) return result
        return {
            files: result.files.map((f) => ({ ...f, path: this.translateOut(f.path, prefix) })),
            truncated: result.truncated
        }
    }

    async grep(pattern: string, dirPath: string | null = '/', glob: string | null = null): Promise<GrepResult> {
        const basePath = dirPath ?? '/'
        const { backend, prefix } = this.resolve(basePath)
        const result = await backend.grep(pattern, this.translateIn(basePath, prefix), glob)
        if ('error' in result) return result
        return {
            matches: result.matches.map((m) => ({ ...m, path: this.translateOut(m.path, prefix) })),
            truncated: result.truncated
        }
    }
}
