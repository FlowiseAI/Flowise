import { load } from 'js-yaml'
import { SkillFrontmatter, ValidationError } from './types'

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\s*(?:\n|$)/
const KNOWN_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'allowed-tools', 'metadata'])

export function parseFrontmatter(raw: string): SkillFrontmatter | ValidationError {
    const match = FRONTMATTER_RE.exec(raw)
    if (!match) {
        return { message: 'missing frontmatter — expected --- delimited YAML block at top of file' }
    }

    let parsed: any
    try {
        parsed = load(match[1])
    } catch (e: any) {
        return { message: `invalid YAML: ${e?.message ?? String(e)}` }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { message: 'frontmatter must be a YAML mapping' }
    }

    const result: SkillFrontmatter = {
        name: parsed.name,
        description: parsed.description,
        license: parsed.license,
        compatibility: parsed.compatibility,
        allowedTools: parsed['allowed-tools'],
        metadata: parsed.metadata
    }

    const extras: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed)) {
        if (!KNOWN_KEYS.has(k)) extras[k] = v
    }
    if (Object.keys(extras).length) {
        result.metadata = { ...(result.metadata ?? {}), ...extras }
    }

    return result
}
