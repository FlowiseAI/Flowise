// Overlaps with mapMimeTypeToExt (src/utils.ts), S3File.ts, GoogleDrive.ts, agentflow/utils.ts.
// TODO: consolidate into shared packages/components/src/mime.ts.
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
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
    return MIME_MAP[ext] ?? 'application/octet-stream'
}

export function isTextMimeType(mimeType: string): boolean {
    return TEXT_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) || TEXT_MIME_EXACT.has(mimeType)
}

export function paginateLines(text: string, offset: number, limit: number): string {
    const lines = text.split('\n')
    return lines.slice(offset, offset + limit).join('\n')
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
