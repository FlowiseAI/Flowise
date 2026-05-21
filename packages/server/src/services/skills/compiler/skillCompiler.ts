import {
    CompileInput,
    FileReference,
    SkillBundle,
    SkillBundleEntry,
    SkillDocument,
    SkillMetadata,
    ToolDependencies,
    ToolDependency,
    ToolReference
} from '../entities'
import { canonicalJson, sha256 } from '../utils/digest'
import { parsePlaceholders, PlaceholderToken } from './placeholderParser'
import { createFileResolver } from './fileResolver'
import { isToolEnabled, resolveToolLabel, toolDependencyFromToken, toolReferenceFromToken } from './toolResolver'
import { propagate } from './transitivePropagator'

export const SCHEMA_VERSION = 1 as const
export const BROKEN_REF_MARKER = '[SKILL_BROKEN_REFERENCE]'

/**
 * SkillCompiler — stateless, pure TS. Two public methods:
 *   compileAll(input): SkillBundle  — build every skill-node of one skill
 *   compileOne(doc, bundle): SkillBundleEntry  — runtime resolution
 *
 * Keeps a `warnings` array (cycles, unknown tokens) on the returned bundle for
 * visibility; fatal errors throw.
 */
export class SkillCompiler {
    compileAll(input: CompileInput): SkillBundle {
        const { skillId, workspaceId, fileTree, nodeDocuments } = input

        // Phase 1 — parse each skill-kind doc, build dependency graph.
        const docsById = new Map<string, SkillDocument>()
        for (const d of nodeDocuments) docsById.set(d.nodeId, d)

        const dependencyGraph: Record<string, string[]> = {}
        const reverseGraph: Record<string, string[]> = {}
        for (const doc of nodeDocuments) dependencyGraph[doc.nodeId] = []

        const parsed = new Map<string, ReturnType<typeof parsePlaceholders>>()
        for (const doc of nodeDocuments) {
            if (doc.kind !== 'skill') continue
            const result = parsePlaceholders(doc.content)
            parsed.set(doc.nodeId, result)
            for (const t of result.tokens) {
                if (t.kind === 'skill' && t.skill && docsById.has(t.skill.nodeId)) {
                    if (!dependencyGraph[doc.nodeId].includes(t.skill.nodeId)) {
                        dependencyGraph[doc.nodeId].push(t.skill.nodeId)
                    }
                    ;(reverseGraph[t.skill.nodeId] ||= []).push(doc.nodeId)
                }
            }
        }

        // Phase 2 — direct compile. Produces a preliminary SkillBundleEntry for every node.
        const fileResolver = createFileResolver(fileTree)
        const entries: Record<string, SkillBundleEntry> = {}
        for (const doc of nodeDocuments) {
            entries[doc.nodeId] = this.buildEntryShell(doc)
        }
        for (const doc of nodeDocuments) {
            if (doc.kind !== 'skill') continue
            const result = parsed.get(doc.nodeId)!
            const resolved = this.resolveContent(doc, result, (from, to) => fileResolver.resolvePath(from, to))
            const entry = entries[doc.nodeId]
            entry.content = resolved.content
            entry.tools = resolved.tools
            entry.files = resolved.files
        }

        // Phase 2.5 — snapshot direct deps so consumers (e.g. graph builder) can
        // distinguish direct vs transitive after propagation mutates entries in place.
        for (const entry of Object.values(entries)) {
            entry.directTools = entry.tools.dependencies.slice()
            entry.directFiles = entry.files.references.slice()
        }

        // Phase 3 — transitive propagation.
        propagate(entries, dependencyGraph)

        // Phase 4 — emit bundle.
        const bundleId = sha256(
            canonicalJson({
                schemaVersion: SCHEMA_VERSION,
                fileTree,
                nodes: nodeDocuments.map((d) => ({ id: d.nodeId, digest: d.contentDigest })).sort((a, b) => a.id.localeCompare(b.id))
            })
        )

        return {
            schemaVersion: SCHEMA_VERSION,
            bundleId,
            workspaceId,
            skillId,
            builtAt: new Date().toISOString(),
            entries,
            dependencyGraph,
            reverseGraph
        }
    }

    /**
     * Runtime resolution for an anonymous prompt that points at a tree node.
     * The returned entry's content has skill-specific placeholders fully
     * resolved; Flowise runtime tokens (`{{question}}`, `{{$vars.…}}`, …) are
     * left verbatim for the call-site resolver.
     */
    compileOne(prompt: SkillDocument, bundle: SkillBundle): SkillBundleEntry {
        const result = parsePlaceholders(prompt.content)

        const base: SkillBundleEntry = this.buildEntryShell(prompt)

        for (const token of result.tokens) {
            if (token.kind === 'skill' && token.skill) {
                const dep = bundle.entries[token.skill.nodeId]
                if (dep) {
                    mergeInto(base.tools, dep.tools)
                    mergeIntoFiles(base.files, dep.files)
                }
            }
        }

        const resolveFn = (from: string, to: string): string | null => {
            // From the anon document we always produce absolute paths; look up via entries.
            const entry = bundle.entries[to]
            if (!entry) return null
            return `skills/${entry.path}`
        }
        const resolved = this.resolveContent(prompt, result, resolveFn)
        base.content = resolved.content
        mergeInto(base.tools, resolved.tools)
        mergeIntoFiles(base.files, resolved.files)
        return base
    }

    // ---------------- Internals ----------------

    private buildEntryShell(doc: SkillDocument): SkillBundleEntry {
        return {
            nodeId: doc.nodeId,
            kind: doc.kind,
            name: doc.filename,
            path: doc.path,
            source: { nodeId: doc.nodeId, contentDigest: doc.contentDigest },
            tools: { dependencies: [], references: [] },
            files: { references: [] },
            content: doc.kind === 'skill' ? doc.content : ''
        }
    }

    /**
     * Replace skill-specific placeholders inside one doc's content.
     *
     * - Leave runtime tokens untouched.
     * - Drop disabled tools from groups.
     * - Emit BROKEN_REF_MARKER for unknown skill ids.
     */
    private resolveContent(
        doc: SkillDocument,
        result: ReturnType<typeof parsePlaceholders>,
        resolvePath: (fromNodeId: string, toNodeId: string) => string | null
    ): { content: string; tools: ToolDependencies; files: { references: FileReference[] } } {
        const tools: ToolDependencies = { dependencies: [], references: [] }
        const files: { references: FileReference[] } = { references: [] }
        const metadata: SkillMetadata = doc.metadata || { tools: {} }

        // Build replacements. Tool groups take precedence over their inner tool tokens.
        const replacements: Array<{ start: number; end: number; replacement: string }> = []

        const groupRanges = result.toolGroups.map((g) => ({ start: g.start, end: g.end }))
        const inGroup = (tok: PlaceholderToken): boolean => groupRanges.some((r) => tok.start >= r.start && tok.end <= r.end)

        for (const group of result.toolGroups) {
            const enabled = group.tools.filter((t) => isToolEnabled(t, metadata))
            for (const t of enabled) {
                addToolDep(tools, t, metadata)
            }
            const replacement = enabled.length ? `[${enabled.map((t) => resolveToolLabel(t, metadata)).join(', ')}]` : ''
            replacements.push({ start: group.start, end: group.end, replacement })
        }

        for (const tok of result.tokens) {
            if (tok.kind === 'tool') {
                if (inGroup(tok)) continue // already handled by group
                addToolDep(tools, tok, metadata)
                replacements.push({ start: tok.start, end: tok.end, replacement: resolveToolLabel(tok, metadata) })
            } else if (tok.kind === 'skill' && tok.skill) {
                const path = resolvePath(doc.nodeId, tok.skill.nodeId)
                if (path === null) {
                    replacements.push({ start: tok.start, end: tok.end, replacement: BROKEN_REF_MARKER })
                } else {
                    files.references.push({ source: 'app', nodeId: tok.skill.nodeId })
                    replacements.push({ start: tok.start, end: tok.end, replacement: path })
                }
            }
            // passthrough tokens are left in place
        }

        replacements.sort((a, b) => a.start - b.start)
        let content = doc.content
        const pieces: string[] = []
        let cursor = 0
        for (const r of replacements) {
            if (r.start < cursor) continue // overlapping guard
            pieces.push(content.slice(cursor, r.start))
            pieces.push(r.replacement)
            cursor = r.end
        }
        pieces.push(content.slice(cursor))
        content = pieces.join('')

        return { content, tools, files }
    }
}

// -----------------------------------------------------------------------------

const addToolDep = (acc: ToolDependencies, tok: PlaceholderToken, meta: SkillMetadata): void => {
    const dep = toolDependencyFromToken(tok, meta)
    if (dep) {
        const key = `${dep.type}::${dep.provider}::${dep.toolName}`
        if (!acc.dependencies.some((d) => `${d.type}::${d.provider}::${d.toolName}` === key)) {
            acc.dependencies.push(dep)
        }
    }
    const ref = toolReferenceFromToken(tok, meta)
    if (ref) {
        const key = `${ref.type}::${ref.provider}::${ref.toolName}::${ref.uuid}`
        if (!acc.references.some((r) => `${r.type}::${r.provider}::${r.toolName}::${r.uuid}` === key)) {
            acc.references.push(ref)
        }
    }
}

const mergeInto = (into: ToolDependencies, from: ToolDependencies): void => {
    const depKey = (d: ToolDependency) => `${d.type}::${d.provider}::${d.toolName}`
    const refKey = (r: ToolReference) => `${r.type}::${r.provider}::${r.toolName}::${r.uuid}`
    const deps = new Set(into.dependencies.map(depKey))
    for (const d of from.dependencies) if (!deps.has(depKey(d))) into.dependencies.push(d)
    const refs = new Set(into.references.map(refKey))
    for (const r of from.references) if (!refs.has(refKey(r))) into.references.push(r)
}

const mergeIntoFiles = (into: { references: FileReference[] }, from: { references: FileReference[] }): void => {
    const key = (f: FileReference) => `${f.source}::${f.nodeId}`
    const set = new Set(into.references.map(key))
    for (const f of from.references) if (!set.has(key(f))) into.references.push(f)
}
