export interface FileInfo {
    name: string
    path: string
    size: number
    isDirectory: boolean
    mimeType?: string
}

export interface FileData {
    content: string | Uint8Array
    mimeType: string
    created_at: number
    modified_at: number
}

// FilesUpdate: returned by StateBackend's write/edit so the tool layer can splice
// changes into SmartAgent graph state. `null` means "externally persisted — skip splice."
export type FilesUpdate = Record<string, FileData | null>

export interface GrepMatch {
    path: string
    line: number
    content: string
}

export type LsResult = { files: FileInfo[] } | { error: string }
export type ReadResult =
    | { content: string; mimeType: string; truncated: boolean }
    | { content: Uint8Array; mimeType: string }
    | { error: string }
export type ReadRawResult = { data: FileData } | { error: string }
export type WriteResult = { path: string; filesUpdate: FilesUpdate | null } | { error: string }
export type EditResult = { path: string; occurrences: number; filesUpdate: FilesUpdate | null } | { error: string }
export type GrepResult = { matches: GrepMatch[]; truncated: boolean } | { error: string }
export type GlobResult = { files: FileInfo[]; truncated: boolean } | { error: string }

export interface BackendProtocol {
    ls(path: string): Promise<LsResult>
    read(path: string, offset?: number, limit?: number): Promise<ReadResult>
    readRaw(path: string): Promise<ReadRawResult>
    write(path: string, content: string | Uint8Array): Promise<WriteResult>
    edit(path: string, oldStr: string, newStr: string, replaceAll?: boolean): Promise<EditResult>
    grep(pattern: string, path?: string | null, glob?: string | null): Promise<GrepResult>
    glob(pattern: string, path?: string): Promise<GlobResult>
}

// Default line cap for read() when the LLM doesn't pass one. Backends use this to
// paginate large text files so a single read can't blow the model's context window
// (~500 lines ≈ a few thousand tokens). Matches Claude Code's Read tool default.
export const DEFAULT_READ_LIMIT = 500
