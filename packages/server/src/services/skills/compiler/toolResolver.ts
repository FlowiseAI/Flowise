import { SkillMetadata, ToolDependency, ToolReference } from '../entities'
import { PlaceholderToken } from './placeholderParser'

/**
 * Resolve a `{{tool.<provider>.<toolName>.<uuid>}}` placeholder against the
 * node's author-supplied `metadata.tools` map.
 *
 * Output is a short, human-readable label the LLM can "see":
 *   "[Candidate Lookup: custom.candidate_lookup_tool.uuid-1]"
 */
export const resolveToolLabel = (token: PlaceholderToken, metadata: SkillMetadata): string => {
    if (token.kind !== 'tool' || !token.tool) return token.raw
    const { provider, toolName, uuid } = token.tool
    const ref = metadata.tools?.[uuid]
    const display = ref ? prettyName(ref) : prettyFromName(toolName)
    return `[${display}: ${provider}.${toolName}.${uuid}]`
}

/** Dependency record used by the bundle. Canonical (type, provider, toolName) triple. */
export const toolDependencyFromToken = (token: PlaceholderToken, metadata: SkillMetadata): ToolDependency | null => {
    if (token.kind !== 'tool' || !token.tool) return null
    const ref = metadata.tools?.[token.tool.uuid]
    return {
        type: ref?.type ?? 'custom',
        provider: token.tool.provider,
        toolName: token.tool.toolName
    }
}

/** `ToolReference` keeps per-invocation data (credential, config) for the bundle. */
export const toolReferenceFromToken = (token: PlaceholderToken, metadata: SkillMetadata): ToolReference | null => {
    if (token.kind !== 'tool' || !token.tool) return null
    const ref = metadata.tools?.[token.tool.uuid]
    return {
        type: ref?.type ?? 'custom',
        provider: token.tool.provider,
        toolName: token.tool.toolName,
        uuid: token.tool.uuid,
        credentialId: ref?.credentialId,
        enabled: ref?.enabled ?? true,
        config: ref?.config
    }
}

/** Whether a tool reference is enabled (used for tool-group stripping). */
export const isToolEnabled = (token: PlaceholderToken, metadata: SkillMetadata): boolean => {
    if (token.kind !== 'tool' || !token.tool) return false
    const ref = metadata.tools?.[token.tool.uuid]
    return ref ? ref.enabled !== false : true
}

// -----------------------------------------------------------------------------
// Naming helpers
// -----------------------------------------------------------------------------

const prettyName = (ref: ToolReference): string => {
    return titleCase(ref.toolName)
}

const prettyFromName = (name: string): string => titleCase(name)

const titleCase = (s: string): string =>
    s
        .replace(/[-_]+/g, ' ')
        .trim()
        .split(/\s+/)
        .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ')
