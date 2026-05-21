import { randomUUID } from 'crypto'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { CreateNodeDto, SkillFileTree, SkillNodePayload, SkillTreeNode, UpdateNodeDto } from './entities'
import { getSkillById, saveFileTree } from './SkillService'
import * as SkillStorage from './SkillStorage'
import { assertValidTree, buildIndex, classifyKind, descendantsOf, guessMime, parseFileTree, wouldCreateCycle } from './utils/tree'

/**
 * Tree + per-node-payload service. All mutations go through here so that
 * `fileTree`, storage payloads, and `contentDigest` stay consistent.
 */

// ---------------- helpers ----------------

const reloadTree = async (workspaceId: string, skillId: string): Promise<SkillFileTree> => {
    const row = await getSkillById(workspaceId, skillId)
    return parseFileTree(row.fileTree)
}

const nextOrderForParent = (tree: SkillFileTree, parentId: string | null): number => {
    const siblings = tree.nodes.filter((n) => n.parent_id === parentId)
    return siblings.length ? Math.max(...siblings.map((s) => s.order)) + 1 : 0
}

// ---------------- node CRUD ----------------

export const createNode = async (workspaceId: string, skillId: string, dto: CreateNodeDto): Promise<SkillTreeNode> => {
    try {
        if (!dto.name?.trim()) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Node name is required')
        }
        if (dto.node_type !== 'file' && dto.node_type !== 'folder') {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Invalid node_type: ${dto.node_type}`)
        }

        const tree = await reloadTree(workspaceId, skillId)
        const index = buildIndex(tree)

        if (dto.parentId !== null && dto.parentId !== undefined) {
            const parent = index.get(dto.parentId)
            if (!parent) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Parent ${dto.parentId} not found`)
            if (parent.node_type !== 'folder') {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Parent ${dto.parentId} is not a folder`)
            }
        }

        const id = randomUUID()
        const extension = (dto.extension ?? deriveExtension(dto.name)).replace(/^\./, '')
        const order = dto.order ?? nextOrderForParent(tree, dto.parentId ?? null)

        const node: SkillTreeNode = {
            id,
            node_type: dto.node_type,
            name: dto.name.trim(),
            parent_id: dto.parentId ?? null,
            order,
            extension: dto.node_type === 'folder' ? '' : extension,
            size: 0
        }

        tree.nodes.push(node)
        assertValidTree(tree)

        // Persist payload for file nodes (non-binary). Skip folders.
        if (node.node_type === 'file' && dto.content !== undefined) {
            const kind = classifyKind(node.extension)
            if (kind !== 'binary') {
                const payload: SkillNodePayload = { content: dto.content, metadata: dto.metadata }
                const meta = await SkillStorage.putNodeJson(workspaceId, skillId, node.id, payload, node.extension)
                node.size = meta.size
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Use POST /nodes/:id/upload to supply bytes for binary nodes`)
            }
        }

        await saveFileTree(workspaceId, skillId, tree)
        return node
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillTreeService.createNode - ${getErrorMessage(error)}`)
    }
}

const deriveExtension = (filename: string): string => {
    const idx = filename.lastIndexOf('.')
    return idx === -1 ? '' : filename.slice(idx + 1)
}

export const getNode = async (workspaceId: string, skillId: string, nodeId: string) => {
    const tree = await reloadTree(workspaceId, skillId)
    const index = buildIndex(tree)
    const node = index.get(nodeId)
    if (!node) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node ${nodeId} not found`)

    const meta = await SkillStorage.getNodeMeta(workspaceId, skillId, nodeId)
    if (node.node_type === 'folder') {
        return { node, meta }
    }
    const kind = classifyKind(node.extension)
    if (kind === 'binary') {
        return { node, meta, kind }
    }
    const payload = await SkillStorage.getNodeJson(workspaceId, skillId, nodeId)
    return { node, meta, kind, content: payload?.content ?? '', metadata: payload?.metadata }
}

export const updateNode = async (workspaceId: string, skillId: string, nodeId: string, dto: UpdateNodeDto): Promise<SkillTreeNode> => {
    try {
        const tree = await reloadTree(workspaceId, skillId)
        const index = buildIndex(tree)
        const node = index.get(nodeId)
        if (!node) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node ${nodeId} not found`)

        if (dto.parentId !== undefined) {
            if (wouldCreateCycle(nodeId, dto.parentId, index)) {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Move would create a cycle`)
            }
            if (dto.parentId !== null) {
                const parent = index.get(dto.parentId)
                if (!parent) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Parent ${dto.parentId} not found`)
                if (parent.node_type !== 'folder') {
                    throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Parent ${dto.parentId} is not a folder`)
                }
            }
            node.parent_id = dto.parentId
        }

        if (dto.name !== undefined) {
            const trimmed = dto.name.trim()
            if (!trimmed) throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Node name cannot be empty')
            node.name = trimmed
            if (node.node_type === 'file') node.extension = deriveExtension(node.name)
        }

        if (dto.order !== undefined) node.order = dto.order

        // Content update only applies to file nodes of non-binary kind.
        if (dto.content !== undefined || dto.metadata !== undefined) {
            if (node.node_type !== 'file') {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Cannot set content on a folder')
            }
            const kind = classifyKind(node.extension)
            if (kind === 'binary') {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Use POST /nodes/:id/upload to update binary content')
            }
            const existing = await SkillStorage.getNodeJson(workspaceId, skillId, nodeId)
            const payload: SkillNodePayload = {
                content: dto.content ?? existing?.content ?? '',
                metadata: dto.metadata ?? existing?.metadata
            }
            const meta = await SkillStorage.putNodeJson(workspaceId, skillId, nodeId, payload, node.extension)
            node.size = meta.size
        }

        assertValidTree(tree)
        await saveFileTree(workspaceId, skillId, tree)
        return node
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillTreeService.updateNode - ${getErrorMessage(error)}`)
    }
}

export const deleteNode = async (workspaceId: string, skillId: string, nodeId: string, recursive = false): Promise<void> => {
    try {
        const tree = await reloadTree(workspaceId, skillId)
        const index = buildIndex(tree)
        const node = index.get(nodeId)
        if (!node) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node ${nodeId} not found`)

        const descendants = descendantsOf(nodeId, tree)
        if (descendants.length > 0 && !recursive) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Node ${nodeId} has descendants; pass ?recursive=true to delete them`)
        }

        const toDelete = [nodeId, ...descendants]
        const deleteSet = new Set(toDelete)
        tree.nodes = tree.nodes.filter((n) => !deleteSet.has(n.id))

        for (const id of toDelete) {
            await SkillStorage.deleteNodeAssets(workspaceId, skillId, id)
        }

        await saveFileTree(workspaceId, skillId, tree)
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: skillTreeService.deleteNode - ${getErrorMessage(error)}`)
    }
}

export const uploadBinary = async (
    workspaceId: string,
    skillId: string,
    nodeId: string,
    buffer: Buffer,
    mime?: string
): Promise<{ size: number; digest: string; mime: string }> => {
    try {
        const tree = await reloadTree(workspaceId, skillId)
        const index = buildIndex(tree)
        const node = index.get(nodeId)
        if (!node) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node ${nodeId} not found`)
        if (node.node_type !== 'file') throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Node ${nodeId} is a folder`)

        const effectiveMime = mime ?? guessMime(node.extension)
        const meta = await SkillStorage.putNodeBinary(workspaceId, skillId, nodeId, buffer, effectiveMime)
        node.size = meta.size
        await saveFileTree(workspaceId, skillId, tree)
        return { size: meta.size, digest: meta.digest, mime: meta.mime }
    } catch (error) {
        if (error instanceof InternalFlowiseError) throw error
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: skillTreeService.uploadBinary - ${getErrorMessage(error)}`
        )
    }
}

export const downloadBinary = async (workspaceId: string, skillId: string, nodeId: string) => {
    const tree = await reloadTree(workspaceId, skillId)
    const index = buildIndex(tree)
    const node = index.get(nodeId)
    if (!node) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node ${nodeId} not found`)
    if (node.node_type !== 'file') throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Node ${nodeId} is a folder`)
    const meta = await SkillStorage.getNodeMeta(workspaceId, skillId, nodeId)
    const kind = classifyKind(node.extension)
    if (kind === 'binary') {
        const buf = await SkillStorage.getNodeBinary(workspaceId, skillId, nodeId)
        if (!buf) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Node ${nodeId} payload missing`)
        return { buffer: buf, mime: meta?.mime ?? guessMime(node.extension), node }
    }
    const payload = await SkillStorage.getNodeJson(workspaceId, skillId, nodeId)
    const buf = Buffer.from(payload?.content ?? '', 'utf8')
    return { buffer: buf, mime: meta?.mime ?? guessMime(node.extension), node }
}
