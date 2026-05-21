import { StatusCodes } from 'http-status-codes'
import { Skill } from '../../database/entities/Skill'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import {
    CompileInput,
    CreateSkillDto,
    PublishedPointer,
    SkillBundle,
    SkillDocument,
    SkillFileTree,
    SkillNodePayload,
    UpdateSkillDto
} from './entities'
import { SkillCompiler } from './compiler/skillCompiler'
import * as SkillStorage from './SkillStorage'
import * as SkillBundleManager from './bundle/SkillBundleManager'
import { buildSkillGraph, SkillGraphDTO } from './bundle/SkillGraphBuilder'
import { canonicalJson, sha256 } from './utils/digest'
import { parseFileTree, serializeFileTree, buildIndex, computePath, classifyKind } from './utils/tree'

/**
 * Skill-row CRUD + publish pipeline. Node-level tree mutations live in
 * SkillTreeService.ts to keep this class focused on row-level concerns.
 */

const repo = () => getRunningExpressApp().AppDataSource.getRepository(Skill)

export const createSkill = async (workspaceId: string, dto: CreateSkillDto): Promise<Skill> => {
    try {
        if (!dto.name || !dto.name.trim()) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Skill name is required')
        }

        // UNIQUE (workspaceId, name) — enforced in service because SQLite/MySQL indexes differ.
        const existing = await repo().findOneBy({ workspaceId, name: dto.name.trim() })
        if (existing) {
            throw new InternalFlowiseError(StatusCodes.CONFLICT, `A skill named "${dto.name}" already exists`)
        }

        const emptyTree: SkillFileTree = { nodes: [] }
        const fileTree = serializeFileTree(emptyTree)
        const contentDigest = sha256(canonicalJson({ fileTree: emptyTree, nodes: [] }))

        const row = repo().create({
            workspaceId,
            name: dto.name.trim(),
            description: dto.description ?? null,
            iconSrc: dto.iconSrc ?? null,
            color: dto.color ?? null,
            fileTree,
            contentDigest,
            publishedBundleId: null
        })
        return await repo().save(row)
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.createSkill - ${getErrorMessage(error)}`)
    }
}

export const getSkillById = async (workspaceId: string, skillId: string): Promise<Skill> => {
    const row = await repo().findOneBy({ id: skillId, workspaceId })
    if (!row) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Skill ${skillId} not found`)
    return row
}

export const listSkills = async (workspaceId: string, page = -1, limit = -1) => {
    try {
        const qb = repo().createQueryBuilder('skill_v2').orderBy('skill_v2.updatedDate', 'DESC')
        if (page > 0 && limit > 0) {
            qb.skip((page - 1) * limit)
            qb.take(limit)
        }
        qb.andWhere('skill_v2.workspaceId = :workspaceId', { workspaceId })
        const [data, total] = await qb.getManyAndCount()
        const shaped = data.map((row) => shapeForList(row))
        return page > 0 && limit > 0 ? { data: shaped, total } : shaped
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.listSkills - ${getErrorMessage(error)}`)
    }
}

const shapeForList = (row: Skill) => {
    const tree = parseFileTree(row.fileTree)
    const nodeCount = tree.nodes.length
    const fileCount = tree.nodes.filter((n) => n.node_type === 'file').length
    return {
        id: row.id,
        workspaceId: row.workspaceId,
        name: row.name,
        description: row.description,
        iconSrc: row.iconSrc,
        color: row.color,
        contentDigest: row.contentDigest,
        publishedBundleId: row.publishedBundleId,
        createdDate: row.createdDate,
        updatedDate: row.updatedDate,
        nodeCount,
        fileCount
    }
}

export const updateSkill = async (workspaceId: string, skillId: string, dto: UpdateSkillDto): Promise<Skill> => {
    try {
        const row = await getSkillById(workspaceId, skillId)

        if (dto.name !== undefined) {
            const name = dto.name.trim()
            if (!name) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Skill name cannot be empty')
            if (name !== row.name) {
                const conflict = await repo().findOneBy({ workspaceId, name })
                if (conflict) throw new InternalFlowiseError(StatusCodes.CONFLICT, `A skill named "${name}" already exists`)
                row.name = name
            }
        }
        if (dto.description !== undefined) row.description = dto.description ?? null
        if (dto.iconSrc !== undefined) row.iconSrc = dto.iconSrc ?? null
        if (dto.color !== undefined) row.color = dto.color ?? null

        return await repo().save(row)
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.updateSkill - ${getErrorMessage(error)}`)
    }
}

export const deleteSkill = async (workspaceId: string, skillId: string): Promise<void> => {
    try {
        await getSkillById(workspaceId, skillId) // 404 if missing
        await repo().delete({ id: skillId, workspaceId })
        await SkillStorage.deleteSkillPrefix(workspaceId, skillId)
        await SkillBundleManager.invalidateSkill(workspaceId, skillId)
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.deleteSkill - ${getErrorMessage(error)}`)
    }
}

// -----------------------------------------------------------------------------
// Compile + publish
// -----------------------------------------------------------------------------

/**
 * Build a `CompileInput` by reading every file node's payload from storage.
 *
 * Per-node reads are issued in parallel (`Promise.all`) — under cloud
 * backends each node's meta + payload is two GETs, and a sequential loop
 * over a 200-file skill would round-trip ~400 times serially. The fan-out
 * is bounded by the tree size, which is itself bounded by the editor.
 */
const loadCompileInput = async (row: Skill): Promise<CompileInput> => {
    const tree = parseFileTree(row.fileTree)
    const index = buildIndex(tree)

    const fileNodes = tree.nodes.filter((n) => n.node_type === 'file')
    const nodeDocuments: SkillDocument[] = await Promise.all(
        fileNodes.map(async (node) => {
            const kind = classifyKind(node.extension)
            const path = computePath(node.id, index)
            const [meta, payload] = await Promise.all([
                SkillStorage.getNodeMeta(row.workspaceId, row.id, node.id),
                kind === 'binary' ? Promise.resolve(null) : SkillStorage.getNodeJson(row.workspaceId, row.id, node.id)
            ])
            const content = payload?.content ?? ''
            const metadata: SkillNodePayload['metadata'] = payload?.metadata
            return {
                nodeId: node.id,
                kind,
                path,
                filename: node.name,
                extension: node.extension,
                content,
                metadata: metadata ?? { tools: {} },
                contentDigest: meta?.digest ?? ''
            }
        })
    )

    return { skillId: row.id, workspaceId: row.workspaceId, fileTree: tree, nodeDocuments }
}

export const compileAll = async (workspaceId: string, skillId: string): Promise<SkillBundle> => {
    try {
        const row = await getSkillById(workspaceId, skillId)
        const input = await loadCompileInput(row)
        const compiler = new SkillCompiler()
        const bundle = compiler.compileAll(input)
        return bundle
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.compileAll - ${getErrorMessage(error)}`)
    }
}

export const publish = async (workspaceId: string, skillId: string): Promise<SkillBundle> => {
    try {
        // Snapshot the currently-published bundleId before we write anything new,
        // so we can garbage-collect its artifacts after the new publish commits.
        const row = await getSkillById(workspaceId, skillId)
        const previousBundleId = row.publishedBundleId

        const input = await loadCompileInput(row)
        const compiler = new SkillCompiler()
        const bundle = compiler.compileAll(input)

        await SkillBundleManager.putBundle(bundle)

        // Write resolved markdown sidecars for inspection in parallel — they
        // are independent files under `artifacts/{bundleId}/resolved/` and a
        // 100-entry skill would otherwise serialize 100 cloud PUTs.
        await Promise.all(
            Object.values(bundle.entries)
                .filter((entry) => entry.kind === 'skill')
                .map((entry) => SkillStorage.putResolvedMd(workspaceId, skillId, bundle.bundleId, entry.nodeId, entry.content))
        )

        const pointer: PublishedPointer = { currentBundleId: bundle.bundleId, publishedAt: bundle.builtAt }
        await SkillStorage.putPublishedPointer(workspaceId, skillId, pointer)

        await repo().update({ id: skillId, workspaceId }, { publishedBundleId: bundle.bundleId })

        // Only after the new bundle is fully committed do we drop the previous one's
        // artifacts (and its cache entry). If anything above threw, the old bundle is
        // left intact so the DB pointer remains valid.
        if (previousBundleId && previousBundleId !== bundle.bundleId) {
            await SkillStorage.deleteBundleArtifacts(workspaceId, skillId, previousBundleId)
            await SkillBundleManager.invalidateBundle(workspaceId, skillId, previousBundleId)
        }

        return bundle
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.publish - ${getErrorMessage(error)}`)
    }
}

export const loadPublishedBundle = async (workspaceId: string, skillId: string): Promise<SkillBundle | null> => {
    const row = await getSkillById(workspaceId, skillId)
    if (!row.publishedBundleId) return null
    return SkillBundleManager.getBundle(workspaceId, skillId, row.publishedBundleId)
}

export const loadDraftBundle = async (workspaceId: string, skillId: string): Promise<SkillBundle> => {
    const bundle = await compileAll(workspaceId, skillId)
    return bundle
}

export const getGraph = async (workspaceId: string, skillId: string, mode: 'draft' | 'published' = 'draft'): Promise<SkillGraphDTO> => {
    try {
        const bundle = mode === 'published' ? await loadPublishedBundle(workspaceId, skillId) : await loadDraftBundle(workspaceId, skillId)
        if (!bundle) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No bundle published yet')
        }
        return buildSkillGraph(bundle)
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillsService.getGraph - ${getErrorMessage(error)}`)
    }
}

export const getDependencies = async (workspaceId: string, skillId: string, nodeId?: string) => {
    const bundle = await compileAll(workspaceId, skillId)
    if (!nodeId) {
        const allIds = Object.keys(bundle.entries)
        return aggregateEntries(bundle, allIds)
    }
    const entry = bundle.entries[nodeId]
    if (!entry) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node ${nodeId} not found`)
    const direct = { tools: entry.tools.dependencies, files: entry.files.references.map((f) => f.nodeId) }
    const transitive = aggregateEntries(bundle, collectTransitive(bundle, nodeId))
    return { direct, transitive }
}

const collectTransitive = (bundle: SkillBundle, nodeId: string): string[] => {
    const out = new Set<string>([nodeId])
    const stack = [nodeId]
    while (stack.length) {
        const cur = stack.pop()!
        for (const dep of bundle.dependencyGraph[cur] || []) {
            if (!out.has(dep)) {
                out.add(dep)
                stack.push(dep)
            }
        }
    }
    return Array.from(out)
}

const aggregateEntries = (bundle: SkillBundle, nodeIds: string[]) => {
    const tools: string[] = []
    const files: string[] = []
    const seenTools = new Set<string>()
    const seenFiles = new Set<string>()
    for (const id of nodeIds) {
        const entry = bundle.entries[id]
        if (!entry) continue
        for (const dep of entry.tools.dependencies) {
            const key = `${dep.provider}.${dep.toolName}`
            if (!seenTools.has(key)) {
                tools.push(key)
                seenTools.add(key)
            }
        }
        for (const f of entry.files.references) {
            if (!seenFiles.has(f.nodeId)) {
                files.push(f.nodeId)
                seenFiles.add(f.nodeId)
            }
        }
    }
    return { tools, files }
}

// -----------------------------------------------------------------------------
// Internal helpers used by SkillTreeService
// -----------------------------------------------------------------------------

export const saveFileTree = async (workspaceId: string, skillId: string, tree: SkillFileTree): Promise<Skill> => {
    const row = await getSkillById(workspaceId, skillId)
    const serialized = serializeFileTree(tree)
    row.fileTree = serialized
    row.contentDigest = await computeContentDigest(workspaceId, skillId, tree)
    const saved = await repo().save(row)
    await SkillBundleManager.invalidateSkill(workspaceId, skillId)
    return saved
}

export const computeContentDigest = async (workspaceId: string, skillId: string, tree: SkillFileTree): Promise<string> => {
    const fileNodes = tree.nodes.filter((n) => n.node_type === 'file')
    const nodes = await Promise.all(
        fileNodes.map(async (node) => {
            const meta = await SkillStorage.getNodeMeta(workspaceId, skillId, node.id)
            return { id: node.id, digest: meta?.digest ?? '' }
        })
    )
    nodes.sort((a, b) => a.id.localeCompare(b.id))
    return sha256(canonicalJson({ fileTree: tree, nodes }))
}
