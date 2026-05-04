import { Tool } from '@langchain/core/tools'
import { DataSource } from 'typeorm'
import { ICommonObject, IDatabaseEntity, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../src/Interface'
import { SkillFileTool } from './SkillFileTool'
import { loadPublishedBundle } from './bundleLoader'
import { buildCustomToolsFromBundle } from './customToolFactory'
import {
    buildBashToolDescription,
    buildManifest,
    detectSandboxCapability,
    indexManifestByNodeId,
    renderReferenceRecipes,
    SandboxBashTool,
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
 *   1. **Sandbox shell** — when the server has `E2B_APIKEY` (and the
 *      sandbox kill-switches are on) the node also registers a single
 *      `bash_<SkillName>` tool that materialises the reachable file tree
 *      inside an E2B VM and lets the LLM issue arbitrary shell commands
 *      against it (python3, node, cat, pdftotext, …).
 *
 *   2. **Fallback (read-only)** — no E2B key, or execution is disabled
 *      via `SKILL_ALLOW_EXEC=false` / the `Enable Sandbox Shell`
 *      toggle. Only the per-file skill tools are registered; the LLM
 *      sees the compiled markdown verbatim. Any code the skill references
 *      becomes documentation the LLM must reason about by hand.
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
                    'When the server has an E2B sandbox configured, register a companion bash tool that can run arbitrary shell commands (python3, node, cat, pdftotext, …) against the reachable skill files. Turn this off to run in read-only fallback mode.',
                type: 'boolean',
                default: true,
                optional: true,
                additionalParams: true
            },
            {
                label: 'Exec Timeout (ms)',
                name: 'execTimeoutMs',
                description:
                    'Per-call timeout in milliseconds for the bash tool. Clamped against the server ceiling (SKILL_EXEC_TIMEOUT_MS, default 15000).',
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

                // Best-effort: pull the published bundle so we can surface
                // each file's YAML frontmatter (`name`, `description`) in the
                // dropdown. When no bundle is published yet — or the lookup
                // fails for any reason — we silently fall back to the
                // filename + path labels used historically.
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
        // Capability + manifest. The manifest is only needed for the bash
        // path, so building it when the user opted out keeps init() cheap.
        // ------------------------------------------------------------------
        const bashEnabledByUser = nodeData.inputs?.enableBash === false ? false : true
        const capability = bashEnabledByUser ? detectSandboxCapability(process.env) : null

        if (capability) {
            const userTimeout = Number(nodeData.inputs?.execTimeoutMs)
            if (Number.isFinite(userTimeout) && userTimeout > 0) {
                capability.maxTimeoutMs = Math.min(userTimeout, capability.maxTimeoutMs)
            }
        }

        const manifest: SandboxManifest | null = capability ? buildManifest(bundle, selectedIds) : null
        const bashAvailable = !!capability && !!manifest && manifest.entries.length > 0

        // Precompute bash tool name and node-id index once so every per-
        // skill hint shares the same values. When bash is not available,
        // both stay unused.
        const bashToolName = bashAvailable ? formatToolName(`bash_${row.name || 'skill'}`) : null
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
        // Custom tools referenced by the selected skill files. The compiled
        // bundle records each `{{tool.<provider>.<toolName>.<uuid>}}`
        // placeholder as a `ToolReference`; here we resolve every enabled
        // `type: 'custom'` reference back to the live `Tool` DB row and
        // expose it as a `DynamicStructuredTool`, exactly like the standalone
        // `CustomTool` node would. Other reference types (mcp / http /
        // builtin) are still only surfaced through the textual hint.
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
            // DynamicStructuredTool extends StructuredTool which shares the
            // BaseTool interface with Tool — safe to widen for the agent.
            tools.push(t as unknown as Tool)
        }

        // ------------------------------------------------------------------
        // Companion sandbox shell — only registered when E2B is available
        // and the manifest has at least one materialisable entry. In every
        // other case the node runs in fallback/read-only mode: the LLM sees
        // the compiled markdown and acts on it without execution.
        // ------------------------------------------------------------------
        if (bashAvailable && capability && manifest && bashToolName) {
            const bashTool = buildBashSessionTool({
                workspaceId: row.workspaceId,
                skillId: row.id,
                toolName: bashToolName,
                bundle,
                manifest,
                capability
            })
            // StructuredTool extends BaseTool; it's safe to push into Tool[]
            // for the downstream agent which only requires the shared Tool
            // interface.
            tools.push(bashTool as unknown as Tool)
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
 * Wire up one `SandboxSession` + `SandboxBashTool` pair for a Skill node.
 *
 * The session is lazy — nothing hits the E2B API until the LLM actually
 * calls the bash tool. When the node goes out of scope (agent run ends),
 * the session's idle timer will eventually close the VM; if the process
 * exits first, the remote sandbox's own lifetime timer reaps it.
 */
const buildBashSessionTool = (args: {
    workspaceId: string
    skillId: string
    /** Pre-formatted LangChain tool name, shared with the skill tools' hints. */
    toolName: string
    bundle: SkillBundle
    manifest: SandboxManifest
    capability: SandboxCapability
}): SandboxBashTool => {
    const { workspaceId, skillId, toolName, bundle, manifest, capability } = args
    const session = new SandboxSession({
        workspaceId,
        skillId,
        bundle,
        manifest,
        capability
    })
    return new SandboxBashTool({
        name: toolName,
        description: buildBashToolDescription(manifest, capability.label),
        session
    })
}

module.exports = { nodeClass: Skill_Tools }
