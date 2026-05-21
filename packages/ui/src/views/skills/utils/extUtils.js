import { CODE_EXTS, EXT_KIND, IMAGE_EXTS, MARKDOWN_EXTS, PDF_EXTS, TEXT_EXTS, VIDEO_EXTS } from '../constants'

export const normaliseExt = (raw) => (raw || '').toLowerCase().replace(/^\./, '')

export const classifyKind = (ext) => {
    const e = normaliseExt(ext)
    return EXT_KIND[e] || (e ? 'binary' : 'data')
}

export const isMarkdown = (ext) => MARKDOWN_EXTS.has(normaliseExt(ext))
export const isText = (ext) => TEXT_EXTS.has(normaliseExt(ext))
export const isCode = (ext) => CODE_EXTS.has(normaliseExt(ext))
export const isImage = (ext) => IMAGE_EXTS.has(normaliseExt(ext))
export const isVideo = (ext) => VIDEO_EXTS.has(normaliseExt(ext))
export const isPdf = (ext) => PDF_EXTS.has(normaliseExt(ext))

// Best-effort feature detection for the browser's built-in PDF viewer. Modern
// Chromium/Firefox/Safari expose `navigator.pdfViewerEnabled` per the HTML
// spec; older browsers only surface support through the legacy
// `navigator.mimeTypes['application/pdf']` lookup. We accept either signal
// and fall back to the binary download panel when neither is present (e.g.
// mobile WebViews that hand PDFs off to an external app).
export const canRenderPdfNatively = () => {
    if (typeof navigator === 'undefined') return false
    if (typeof navigator.pdfViewerEnabled === 'boolean') return navigator.pdfViewerEnabled
    const mime = navigator.mimeTypes && navigator.mimeTypes['application/pdf']
    return Boolean(mime)
}
export const isBinary = (ext) => {
    const e = normaliseExt(ext)
    return EXT_KIND[e] === 'binary' || (!isMarkdown(e) && !isText(e) && !isCode(e))
}
export const isTextLike = (ext) => isMarkdown(ext) || isText(ext) || isCode(ext)

// Maps extensions to a react-markdown / lowlight language hint for the
// preview's fenced code block. Falls back to the raw extension.
export const languageHint = (ext) => {
    const e = normaliseExt(ext)
    const map = {
        js: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        mjs: 'javascript',
        py: 'python',
        sh: 'bash',
        bash: 'bash',
        yaml: 'yaml',
        yml: 'yaml',
        md: 'markdown',
        markdown: 'markdown'
    }
    return map[e] || e || 'text'
}

// Parses the part of `name` after the last '.' so the tree node's `extension`
// can be kept in sync if a user renames a file with a new suffix.
export const parseExtFromName = (name) => {
    if (!name) return ''
    const dot = name.lastIndexOf('.')
    if (dot < 0 || dot === name.length - 1) return ''
    return name.slice(dot + 1).toLowerCase()
}

export const humanBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let n = bytes
    while (n >= 1024 && i < units.length - 1) {
        n /= 1024
        i += 1
    }
    return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`
}
