import { StructuredTool, Tool } from '@langchain/core/tools'
import { DataSource } from 'typeorm'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { isSandboxBackend, resolveBackend, SandboxBackendProtocol, SandboxFileTransfer, SandboxRuntime } from '../../../src/sandbox'
import { SkillFileTool } from './SkillFileTool'
import { loadPublishedBundle } from './bundleLoader'
import { buildCustomToolsFromBundle } from './customToolFactory'
import {
    buildExecuteToolDescription,
    buildManifest,
    buildSkillSandboxArtifactResolver,
    buildStructuredFsTools,
    EvictingExecuteTool,
    ExecuteTool,
    indexManifestByNodeId,
    registerSandboxArtifactResolver,
    renderReferenceRecipes,
    SandboxCapability,
    SandboxManifest,
    SandboxSession
} from './sandbox'
import {
    buildToolDescription,
    buildToolHint,
    classifyKindForTreeNode,
    computeNodePath,
    extractFrontmatterMetadata,
    formatToolName,
    parseFileTree,
    SkillBundle,
    SkillBundleEntry
} from './utils'

/**
 * Skill runtime node.
 *
 * Exposes every selected markdown file inside a published `Skill` as an
 * individual LangChain `Tool`. Compilation already happened at publish time
 * (see `SkillCompiler.compileAll` on the server); this node just reads
 * the pre-compiled `SkillBundle` and wraps each `entry.content` in a
 * `Tool`.
 *
 * Execution model (two modes, no middle ground):
 *
 *   1. **Sandbox shell + structured filesystem tools** — when
 *      `resolveBackend(process.env)` returns a backend that satisfies
 *      `isSandboxBackend`, the node registers six structured FS tools
 *      (`ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`)
 *      plus a single `execute` tool wrapped in a large-output eviction
 *      decorator. This is the architecture-canonical Layer 4 surface.
 *
 *   2. **Fallback (read-only)** — no backend, or execution is disabled
 *      via `SKILL_ALLOW_EXEC=false` / the `Enable Sandbox Shell`
 *      toggle. Only the per-file skill tools are registered; the LLM
 *      sees the compiled markdown verbatim. Any code the skill references
 *      becomes documentation the LLM must reason about by hand.
 *
 * Backend selection (E2B / Docker / future) is the resolver's job;
 * the node itself is engine-agnostic.
 */
class Skill_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Skill'
        this.name = 'skill'
        this.version = 1.2
        this.type = 'Skill'
        this.icon = 'skill.svg'
        this.category = 'Tools'
        this.description = 'Invoke a published Skill — one tool per selected markdown file'
        this.inputs = [
            {
                label: 'Skill',
                name: 'skillId',
                type: 'asyncOptions',
                loadMethod: 'listSkills'
            },
            {
                label: 'Skill Files',
                name: 'skillFiles',
                type: 'asyncMultiOptions',
                loadMethod: 'listSkillFiles',
                refresh: true
            },
            {
                label: 'Enable Sandbox Shell',
                name: 'enableBash',
                description:
                    'When a sandbox backend is configured (E2B, local, …), register the structured filesystem tools and an `execute` tool that can run shell commands against the reachable skill files. Turn this off to run in read-only fallback mode.',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Exec Timeout (ms)',
                name: 'execTimeoutMs',
                description:
                    'Per-call timeout in milliseconds for the execute tool. Clamped against the server ceiling (SKILL_EXEC_TIMEOUT_MS, default 15000).',
                type: 'number',
                optional: true,
                additionalParams: true
            }
        ]
        this.baseClasses = ['Tool']
    }

    //@ts-ignore
    loadMethods = {
        listSkills: async (_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                const appDataSource = options.appDataSource as DataSource
                const databaseEntities = options.databaseEntities as IDatabaseEntity
                if (!appDataSource || !databaseEntities?.['Skill']) {
                    return []
                }

                const searchOptions = options.searchOptions || {}
                const skills = await appDataSource.getRepository(databaseEntities['Skill']).find({
                    where: { ...searchOptions },
                    order: { updatedDate: 'DESC' }
                })

                return skills.map((skill: any) => ({
                    label: skill.name,
                    name: skill.id,
                    description: skill.description || ''
                }))
            } catch {
                return []
            }
        },
        listSkillFiles: async (nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> => {
            const placeholder: INodeOptionsValue[] = [
                {
                    label: 'No Files Available',
                    name: 'error',
                    description: 'Select a Skill first, then refresh'
                }
            ]

            try {
                const skillId = nodeData.inputs?.skillId as string
                if (!skillId) return placeholder

                const appDataSource = options.appDataSource as DataSource
                const databaseEntities = options.databaseEntities as IDatabaseEntity
                if (!appDataSource || !databaseEntities?.['Skill']) {
                    return []
                }

                const searchOptions = options.searchOptions || {}
                const row = await appDataSource.getRepository(databaseEntities['Skill']).findOne({
                    where: { ...searchOptions, id: skillId }
                })
                if (!row) return placeholder

                const tree = parseFileTree((row as any).fileTree)
                const markdownFiles = tree.nodes.filter((n) => n.node_type === 'file' && classifyKindForTreeNode(n.extension) === 'skill')

                if (!markdownFiles.length) {
                    return [
                        {
                            label: 'No Markdown Skill Files',
                            name: 'empty',
                            description: 'This Skill has no markdown files'
                        }
                    ]
                }

                let bundleEntries: Record<string, SkillBundleEntry> | null = null
                const publishedBundleId = (row as any).publishedBundleId as string | undefined
                if (publishedBundleId) {
                    try {
                        const bundle = await loadPublishedBundle((row as any).workspaceId, (row as any).id, publishedBundleId)
                        bundleEntries = bundle.entries || null
                    } catch (error) {
                        console.warn(`Failed to load published bundle for skill ${skillId}: ${(error as Error).message}`)
                        bundleEntries = null
                    }
                }

                return markdownFiles
                    .map((node) => {
                        const fallbackLabel = node.name
                        const fallbackDescription = computeNodePath(node.id, tree) || node.name
                        const entry = bundleEntries?.[node.id]
                        const frontmatter = entry?.content ? extractFrontmatterMetadata(entry.content) : null
                        const label = formatToolName(frontmatter?.name || fallbackLabel)
                        return {
                            label,
                            name: node.id,
                            description: frontmatter?.description || fallbackDescription
                        }
                    })
                    .sort((a, b) => a.label.localeCompare(b.label))
            } catch {
                return placeholder
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const skillId = nodeData.inputs?.skillId as string
        if (!skillId) {
            throw new Error('Skill is required')
        }

        const appDataSource = options.appDataSource as DataSource
        const databaseEntities = options.databaseEntities as IDatabaseEntity
        if (!appDataSource || !databaseEntities?.['Skill']) {
            throw new Error('Database not available')
        }

        const searchOptions = options.searchOptions || {}
        const row: any = await appDataSource.getRepository(databaseEntities['Skill']).findOne({
            where: { ...searchOptions, id: skillId }
        })
        if (!row) {
            throw new Error(`Skill ${skillId} not found`)
        }
        if (!row.publishedBundleId) {
            throw new Error(`Skill "${row.name}" has not been published yet. Publish it from the Skill workspace first.`)
        }

        const bundle: SkillBundle = await loadPublishedBundle(row.workspaceId, row.id, row.publishedBundleId)

        const selectedIds = parseSkillFilesInput(nodeData.inputs?.skillFiles)
        if (!selectedIds.length) {
            // Agents expect a non-empty tool array; if nothing was selected we
            // return an empty list so the chatflow author sees nothing rather
            // than an opaque error.
            return [] as Tool[]
        }

        // ------------------------------------------------------------------
        // Layer 3 middleware — resolve the backend, gate on the structural
        // capability guard, build the manifest. Construction is free; the
        // backend's runtime is not initialised until the LLM actually
        // reaches for execution.
        // ------------------------------------------------------------------
        const bashEnabledByUser = nodeData.inputs?.enableBash === false ? false : true
        const resolved = bashEnabledByUser
            ? resolveBackend(process.env)
            : {
                  backend: null as SandboxBackendProtocol | null,
                  runtime: null as SandboxRuntime | null,
                  capability: null as { label: string; maxTimeoutMs: number; maxOutputBytes: number; backendId: string } | null
              }
        const backend: SandboxBackendProtocol | null = resolved.backend
        const runtime: SandboxRuntime | null = resolved.runtime
        const capability: SandboxCapability | null = resolved.capability
            ? {
                  label: resolved.capability.label,
                  maxTimeoutMs: resolved.capability.maxTimeoutMs,
                  maxOutputBytes: resolved.capability.maxOutputBytes
              }
            : null

        if (capability) {
            const userTimeout = Number(nodeData.inputs?.execTimeoutMs)
            if (Number.isFinite(userTimeout) && userTimeout > 0) {
                capability.maxTimeoutMs = Math.min(userTimeout, capability.maxTimeoutMs)
            }
        }

        const sandboxReady = isSandboxBackend(backend) && capability !== null
        const manifest: SandboxManifest | null = sandboxReady ? buildManifest(bundle, selectedIds) : null
        const bashAvailable = sandboxReady && !!manifest && manifest.entries.length > 0

        const bashToolName = bashAvailable ? resolveExecuteToolName(row.name) : null
        const nodeIdIndex = bashAvailable && manifest ? indexManifestByNodeId(manifest) : null

        // ------------------------------------------------------------------
        // File tools (one per selected markdown skill).
        // ------------------------------------------------------------------
        const tools: Tool[] = []
        for (const nodeId of selectedIds) {
            const entry: SkillBundleEntry | undefined = bundle.entries?.[nodeId]
            if (!entry || entry.kind !== 'skill') continue

            const recipeLines =
                bashAvailable && manifest && nodeIdIndex && bashToolName
                    ? renderReferenceRecipes(entry, manifest, nodeIdIndex, bashToolName)
                    : []

            const hint = buildToolHint(entry, {
                bashMode:
                    bashAvailable && manifest
                        ? {
                              skillsDir: manifest.skillsDir,
                              outputDir: manifest.outputDir,
                              toolName: bashToolName ?? undefined
                          }
                        : null,
                recipeLines
            })

            const frontmatter = entry?.content ? extractFrontmatterMetadata(entry.content) : null
            const name = formatToolName(frontmatter?.name || entry.name)

            const tool = new SkillFileTool({
                name,
                description: buildToolDescription(entry),
                content: entry.content,
                toolHint: hint,
                nodeId: entry.nodeId
            })
            tools.push(tool)
        }

        // ------------------------------------------------------------------
        // Custom tools referenced by the selected skill files.
        // ------------------------------------------------------------------
        const customTools = await buildCustomToolsFromBundle({
            bundle,
            selectedIds,
            appDataSource,
            databaseEntities,
            nodeData,
            options
        })
        for (const t of customTools) {
            tools.push(t as unknown as Tool)
        }

        // ------------------------------------------------------------------
        // Layer 4 — structured filesystem tools and the `execute` tool.
        // Registered in that order so the implicit hierarchy matches the
        // architecture's "structured tools first, shell as escape hatch"
        // recommendation. Eviction wraps only the execute tool —
        // structured FS tools already have their own truncation
        // semantics.
        // ------------------------------------------------------------------
        if (bashAvailable && backend && capability && manifest && bashToolName) {
            // Both shipped backends (E2BBackend, DockerBackend) satisfy
            // SandboxFileTransfer through BaseSandbox. Cast once so the
            // session gets the narrower contract it needs to materialise
            // the manifest.
            const fullBackend = backend as SandboxBackendProtocol & SandboxFileTransfer
            const session = new SandboxSession({
                workspaceId: row.workspaceId,
                skillId: row.id,
                bundle,
                manifest,
                capability,
                backend: fullBackend,
                runtime
            })

            // Hand the structured FS tools (and the eviction decorator) a
            // materializing proxy of the backend. The proxy `ensureStarted()`s
            // the session before every protocol call, so an LLM that opens
            // with `read_file_<Skill>` triggers the same one-time
            // bootAndMaterialize() that `exec()` always paid for in the
            // legacy design. Without this, structured-tool-only conversations
            // would hit an empty sandbox and get `file_not_found` for every
            // manifest entry.
            const readyBackend = session.getBackend()
            const skillSlug = formatToolName(row.name || 'skill')
            const fsTools = buildStructuredFsTools({
                backend: readyBackend,
                skillSlug,
                skillsDir: manifest.skillsDir,
                outputDir: manifest.outputDir
            })
            for (const t of fsTools) {
                tools.push(t as unknown as Tool)
            }

            const executeTool = new ExecuteTool({
                name: bashToolName,
                description: buildExecuteToolDescription(manifest, capability.label),
                session,
                engineLabel: resolved.capability?.backendId ?? 'sandbox'
            })
            const wrapped = new EvictingExecuteTool({
                inner: executeTool as unknown as StructuredTool,
                // The eviction decorator only needs SandboxFileTransfer to
                // write the evicted payload. Reusing the materializing proxy
                // means eviction works even if the LLM evicts before any
                // execute call — which can happen for very chatty structured
                // tool runs.
                backend: readyBackend,
                outputDir: manifest.outputDir,
                readToolName: formatToolName(`read_file_${skillSlug}`)
            })
            tools.push(wrapped as unknown as Tool)

            // Register a per-execution artifact resolver so the agent's
            // sandbox-link rewrite step (Agent#processSandboxLinks) can
            // copy LLM-written files out of /home/user/output/ and into
            // chat-scoped upload storage. Lazy: only files the LLM
            // explicitly links in its final response ever leave the
            // sandbox. Scope-clamped: a resolver only owns paths inside
            // its own outputDir, so multi-skill agents cannot cross
            // sandboxes via this surface. Implementation lives in
            // `sandbox/artifactResolver.ts` so the URI clamp can be
            // exercised directly by tests (this file's CommonJS
            // `module.exports = …` at the bottom would otherwise wipe
            // any named ES export declared here).
            registerSandboxArtifactResolver(options, buildSkillSandboxArtifactResolver(skillSlug, readyBackend, manifest.outputDir))
        }

        return tools
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse the multi-select payload that Flowise sends for `asyncMultiOptions`. */
const parseSkillFilesInput = (raw: unknown): string[] => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string' && v.length > 0)
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0)
        } catch {
            /* noop */
        }
    }
    return []
}

/**
 * Pick the LLM-visible tool name for the execute tool.
 *
 * Defaults to `bash_<SkillName>` so prompts written against the legacy
 * `SandboxBashTool` continue to bind. Set `SKILL_EXEC_TOOL_NAME=execute`
 * to switch to the architecture-canonical name.
 */
const resolveExecuteToolName = (skillName: string | undefined): string => {
    const slug = formatToolName(skillName || 'skill')
    const override = (process.env.SKILL_EXEC_TOOL_NAME || '').trim()
    if (override) {
        // Allow either a fully-qualified name override or a verb prefix
        // (e.g. `execute` → `execute_<SkillName>`).
        return /^[a-zA-Z0-9_-]+$/.test(override)
            ? formatToolName(override === 'execute' ? `execute_${slug}` : override)
            : formatToolName(`bash_${slug}`)
    }
    return formatToolName(`bash_${slug}`)
}

module.exports = { nodeClass: Skill_Tools }
