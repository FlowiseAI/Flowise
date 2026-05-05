import { BackendProtocol } from '../sandbox/BackendProtocol'
import { parseFrontmatter } from './parser'
import { SkillMetadata, SkillSource } from './types'

function joinPath(prefix: string, name: string): string {
    if (prefix.endsWith('/')) return `${prefix}${name}`
    return `${prefix}/${name}`
}

export async function discoverSkills(
    backend: BackendProtocol,
    sources: SkillSource[],
    disabledBuiltinNames?: Set<string>
): Promise<{ skills: SkillMetadata[]; warnings: string[] }> {
    const byName = new Map<string, SkillMetadata>()
    const warnings: string[] = []

    for (const source of sources) {
        const ls = await backend.ls(source.path)
        if ('error' in ls) {
            warnings.push(`skill source "${source.label}" (${source.path}): ${ls.error}`)
            continue
        }

        for (const entry of ls.files) {
            if (!entry.isDirectory) continue
            const skillMdPath = joinPath(entry.path, 'SKILL.md')
            const read = await backend.read(skillMdPath)
            if ('error' in read) {
                warnings.push(`skill at ${entry.path}: ${read.error}`)
                continue
            }
            if (typeof read.content !== 'string') {
                warnings.push(`skill at ${skillMdPath}: SKILL.md is not text`)
                continue
            }

            const parsed = parseFrontmatter(read.content)
            if ('message' in parsed) {
                warnings.push(`skill at ${skillMdPath}: ${parsed.message}`)
                continue
            }

            if (source.label === 'builtin' && disabledBuiltinNames?.has(parsed.name)) {
                continue
            }

            byName.set(parsed.name, {
                ...parsed,
                sourcePath: source.path,
                skillPath: skillMdPath
            })
        }
    }

    return { skills: Array.from(byName.values()), warnings }
}
