// Shared MIME utilities for sandbox, agentflow, and utils.
// S3File.ts and GoogleDrive.ts intentionally keep their own inline maps — those are
// allowlists that gate which file types get parsed by their document loaders. Consolidating
// them here would silently expand the set of supported types beyond what those loaders handle.

// Canonical ext→MIME map. Keys are lowercased with leading dot (e.g. '.pdf').
// First entry per MIME type wins when computing the reverse lookup.
export const EXT_TO_MIME: Record<string, string> = {
    // text / code
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
    '.ini': 'text/plain',
    '.cfg': 'text/plain',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.scss': 'text/css',
    '.less': 'text/css',
    '.xml': 'application/xml',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml',
    '.toml': 'application/toml',
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
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.avif': 'image/avif',
    // documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.rtf': 'application/rtf',
    // audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
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

// Non-standard or secondary MIME aliases not present as primary values in EXT_TO_MIME.
const MIME_ALIASES: Record<string, string> = {
    'application/javascript': 'js',
    'text/xml': 'xml',
    'text/x-markdown': 'md',
    'application/vnd.yaml': 'yaml',
    'application/x-yaml': 'yaml',
    'text/vnd.yaml': 'yaml',
    'text/x-yaml': 'yaml',
    'text/yaml': 'yaml',
    'text/x-sql': 'sql',
    'image/jpg': 'jpg',
    'image/tif': 'tiff',
    'image/vnd.microsoft.icon': 'ico',
    'audio/mp3': 'mp3',
    'audio/x-m4a': 'm4a',
    'audio/oga': 'ogg',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/webm': 'webm',
    'application/json-lines': 'jsonl',
    'application/jsonl': 'jsonl',
    'text/jsonl': 'jsonl'
}

// Auto-inverted from EXT_TO_MIME: maps MIME type → extension (without dot).
// First-listed extension per MIME type wins (e.g. '.js' wins over '.jsx' for text/javascript).
const _MIME_TO_EXT: Record<string, string> = {}
for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
    if (!_MIME_TO_EXT[mime]) _MIME_TO_EXT[mime] = ext.slice(1)
}

const _TEXT_MIME_PREFIXES = ['text/']
const _TEXT_MIME_EXACT = new Set([
    'application/json',
    'application/javascript',
    'application/xml',
    'application/x-sh',
    'application/sql',
    'application/graphql',
    'application/yaml',
    'application/toml'
])

/**
 * Returns the MIME type for a file path based on its extension.
 * Uses lastIndexOf to correctly handle dotfiles (e.g. '.env' → 'text/plain').
 */
export function getMimeType(filePath: string): string {
    const dotIdx = filePath.lastIndexOf('.')
    if (dotIdx === -1) return 'application/octet-stream'
    const ext = filePath.slice(dotIdx).toLowerCase()
    return EXT_TO_MIME[ext] ?? 'application/octet-stream'
}

/** Returns true for MIME types whose content is human-readable text. */
export function isTextMimeType(mimeType: string): boolean {
    return _TEXT_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) || _TEXT_MIME_EXACT.has(mimeType)
}

/**
 * Returns the canonical file extension (without dot) for a MIME type, or '' if unknown.
 * Checks explicit aliases first, then the auto-inverted EXT_TO_MIME map.
 */
export function mapMimeTypeToExt(mimeType: string): string {
    return MIME_ALIASES[mimeType] ?? _MIME_TO_EXT[mimeType] ?? ''
}
