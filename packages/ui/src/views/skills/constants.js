// UI-only sentinel for "the tree root". Never sent to the backend — use
// `null` for `parent_id` on the wire.
export const SKILL_ROOT_ID = 'root'

export const PRESET_COLORS = [
    '#FF6B6B',
    '#FF8E53',
    '#FFC93C',
    '#6BCB77',
    '#4D96FF',
    '#9B59B6',
    '#E056A0',
    '#00B4D8',
    '#2D6A4F',
    '#5C4742',
    '#264653',
    '#7209B7'
]

// Extension → compiler "kind" bucket (mirrors
// packages/server/src/services/skills/utils/tree.ts classifyKind).
export const EXT_KIND = {
    md: 'skill',
    markdown: 'skill',
    txt: 'data',
    json: 'data',
    csv: 'data',
    yaml: 'data',
    yml: 'data',
    xml: 'data',
    tsv: 'data',
    html: 'data',
    log: 'data',
    py: 'code',
    js: 'code',
    ts: 'code',
    tsx: 'code',
    jsx: 'code',
    mjs: 'code',
    sh: 'code',
    bash: 'code',
    go: 'code',
    rb: 'code',
    java: 'code',
    kt: 'code',
    rs: 'code',
    c: 'code',
    cpp: 'code',
    h: 'code',
    hpp: 'code',
    png: 'binary',
    jpg: 'binary',
    jpeg: 'binary',
    gif: 'binary',
    webp: 'binary',
    svg: 'binary',
    pdf: 'binary',
    mp4: 'binary',
    webm: 'binary',
    mp3: 'binary',
    wav: 'binary',
    zip: 'binary'
}

export const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])
export const VIDEO_EXTS = new Set(['mp4', 'webm'])
export const PDF_EXTS = new Set(['pdf'])
export const TEXT_EXTS = new Set(['txt', 'json', 'csv', 'yaml', 'yml', 'xml', 'tsv', 'html', 'log'])
export const CODE_EXTS = new Set([
    'py',
    'js',
    'ts',
    'tsx',
    'jsx',
    'mjs',
    'sh',
    'bash',
    'go',
    'rb',
    'java',
    'kt',
    'rs',
    'c',
    'cpp',
    'h',
    'hpp'
])
export const MARKDOWN_EXTS = new Set(['md', 'markdown'])

// Autosave debounce (ms).
export const AUTOSAVE_DELAY_MS = 1500

// localStorage key for the per-browser auto-save preference. When disabled
// the editor still tracks pending edits but only flushes them on explicit
// Save / file switch / drawer close, which is far less chatty against slow
// remote storage backends like S3.
export const SKILL_AUTOSAVE_STORAGE_KEY = 'skillEditorAutoSave'

// The compiler emits this literal when a placeholder cannot be resolved.
// The Preview / Validate flows count it.
export const BROKEN_REF_MARKER = '[SKILL_BROKEN_REFERENCE]'
