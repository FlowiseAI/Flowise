export { getMimeType, isTextMimeType } from '../../../../src/mime'

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
