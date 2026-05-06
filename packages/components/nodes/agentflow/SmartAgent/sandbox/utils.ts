// Other files that also uses MIME (src/utils.ts), S3File.ts, GoogleDrive.ts, agentflow/utils.ts.
// Which allows for possible consolidation
const MIME_MAP: Record<string, string> = {
    // text
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.js': 'text/javascript',
    '.jsx': 'text/javascript',
    '.mjs': 'text/javascript',
    '.cjs': 'text/javascript',
    '.json': 'application/json',
    '.jsonl': 'application/json',
    '.md': 'text/markdown',
    '.mdx': 'text/markdown',
    '.txt': 'text/plain',
    '.log': 'text/plain',
    '.env': 'text/plain',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.scss': 'text/css',
    '.less': 'text/css',
    '.xml': 'application/xml',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml',
    '.toml': 'application/toml',
    '.ini': 'text/plain',
    '.cfg': 'text/plain',
    '.py': 'text/x-python',
    '.rb': 'text/x-ruby',
    '.go': 'text/x-go',
    '.rs': 'text/x-rust',
    '.java': 'text/x-java',
    '.c': 'text/x-c',
    '.cpp': 'text/x-cpp',
    '.h': 'text/x-c',
    '.sh': 'application/x-sh',
    '.bash': 'application/x-sh',
    '.zsh': 'application/x-sh',
    '.sql': 'application/sql',
    '.graphql': 'application/graphql',
    '.csv': 'text/csv',
    '.tsv': 'text/tab-separated-values',
    // images
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.bmp': 'image/bmp',
    // documents
    '.pdf': 'application/pdf',
    // audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    // video
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
    // archives / binary
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.wasm': 'application/wasm'
}

const TEXT_MIME_PREFIXES = ['text/']
const TEXT_MIME_EXACT = new Set([
    'application/json',
    'application/javascript',
    'application/xml',
    'application/x-sh',
    'application/sql',
    'application/graphql',
    'application/yaml',
    'application/toml'
])

export function getMimeType(filePath: string): string {
    const dot = filePath.lastIndexOf('.')
    if (dot === -1) return 'application/octet-stream'
    const ext = filePath.slice(dot).toLowerCase()
    return MIME_MAP[ext] ?? 'application/octet-stream'
}

export function isTextMimeType(mimeType: string): boolean {
    return TEXT_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) || TEXT_MIME_EXACT.has(mimeType)
}

// Coerce content to FileData's storage shape: text mime → utf-8 string,
// binary mime → base64-encoded string. Pre-existing string for binary mime
// is treated as already-base64 (rehydration case) and passes through.
export function normalizeContent(content: string | Uint8Array, mimeType: string): string {
    if (isTextMimeType(mimeType)) {
        return typeof content === 'string' ? content : new TextDecoder().decode(content)
    }
    return content instanceof Uint8Array ? Buffer.from(content).toString('base64') : content
}

export function paginateLines(text: string, offset: number, limit: number): { content: string; truncated: boolean } {
    const lines = text.split('\n')
    const truncated = lines.length > offset + limit

    return { content: lines.slice(offset, offset + limit).join('\n'), truncated }
}

export function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Convert a glob pattern (*, **, ?) to a RegExp anchored at both ends.
export function globToRegex(pattern: string): RegExp {
    let regexStr = ''
    let i = 0
    while (i < pattern.length) {
        if (pattern[i] === '*' && pattern[i + 1] === '*') {
            regexStr += '.*'
            i += 2
            if (pattern[i] === '/') i++ // skip trailing slash after **
        } else if (pattern[i] === '*') {
            regexStr += '[^/]*'
            i++
        } else if (pattern[i] === '?') {
            regexStr += '[^/]'
            i++
        } else {
            regexStr += escapeRegex(pattern[i])
            i++
        }
    }
    return new RegExp(`^${regexStr}$`)
}

export function formatWithLineNumbers(content: string, startLine: number): string {
    return content
        .split('\n')
        .map((line, i) => `${startLine + i + 1}\t${line}`)
        .join('\n')
}

// 5 MB raw bytes (~6.7 MB base64). Matches Anthropic Claude's per-image limit
// (the smallest common cap). OpenAI vision and Gemini inline data both accept
// larger (~20 MB), so 5 MB works safely across all three providers.
export const MAX_BINARY_READ_SIZE_BYTES = 5 * 1024 * 1024

export interface MultimodalContentBlock {
    type: 'image' | 'audio' | 'video' | 'file'
    mimeType: string
    data: string
}

// Returns a LangChain Multimodal.Standard-shaped content block for the given mime
// type, branching by prefix. Used by the read_file tool to surface binary file
// content to multimodal-capable models.
export function toMultimodalContentBlock(content: Uint8Array, mimeType: string): MultimodalContentBlock {
    const data = Buffer.from(content).toString('base64')
    if (mimeType.startsWith('image/')) return { type: 'image', mimeType, data }
    if (mimeType.startsWith('audio/')) return { type: 'audio', mimeType, data }
    if (mimeType.startsWith('video/')) return { type: 'video', mimeType, data }
    return { type: 'file', mimeType, data }
}

// Decodes FileData.content back to its in-memory shape on the read boundary:
// text mime → utf-8 string as-is; binary mime → base64-decoded Uint8Array.
export function decodeFileContent(content: string, mimeType: string): string | Uint8Array {
    if (isTextMimeType(mimeType)) return content
    return new Uint8Array(Buffer.from(content, 'base64'))
}
