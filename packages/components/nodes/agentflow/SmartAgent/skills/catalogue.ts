import { SkillMetadata } from './types'

const HEADER = `## Skills

You have a library of skills available. Each skill is a structured workflow you can follow when its description matches the user's request. To use a skill, read its SKILL.md via the \`read_file\` tool and follow the instructions inside.

Available skills:`

export function formatSkillsCatalogue(skills: SkillMetadata[]): string {
    if (skills.length === 0) return ''

    const lines: string[] = [HEADER, '']
    for (const s of skills) {
        lines.push(`- **${s.name}**: ${s.description}`)
        if (s.allowedTools && s.allowedTools.length) {
            lines.push(`  → Allowed tools: ${s.allowedTools.join(', ')}`)
        }
        lines.push(`  → Read '${s.skillPath}' for full instructions`)
    }
    return lines.join('\n')
}
