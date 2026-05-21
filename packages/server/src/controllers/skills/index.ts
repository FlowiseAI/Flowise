import fs from 'fs'
import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { SkillTreeService, SkillService } from '../../services/skills'
import { getPageAndLimitParams } from '../../utils/pagination'

/**
 * Thin HTTP wrapper for the Skill services.
 *
 * Path params (all routes):
 *   :skillId  — Skill.id
 *   :nodeId   — tree-node UUID (inside Skill.fileTree)
 *
 * Workspace check: every handler validates `req.user.activeWorkspaceId === req.params.wsId`
 * to prevent cross-tenant reads.
 */

// ------------- helpers -------------

const resolveWorkspace = (req: Request): string => {
    const workspaceId = req.user?.activeWorkspaceId
    if (!workspaceId) {
        throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: Skill - workspace ${workspaceId} not found!`)
    }
    return workspaceId
}

const requireSkillId = (req: Request): string => {
    if (!req.params.skillId) {
        throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'skillId required')
    }
    return req.params.skillId
}

const requireNodeId = (req: Request): string => {
    if (!req.params.nodeId) {
        throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'nodeId required')
    }
    return req.params.nodeId
}

// ------------- skill-level -------------

const createSkill = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const body = req.body || {}
        const skill = await SkillService.createSkill(workspaceId, {
            name: body.name,
            description: body.description,
            iconSrc: body.iconSrc,
            color: body.color
        })
        return res.status(StatusCodes.CREATED).json(skill)
    } catch (error) {
        next(error)
    }
}

const listSkills = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const { page, limit } = getPageAndLimitParams(req)
        const result = await SkillService.listSkills(workspaceId, page, limit)
        return res.json(result)
    } catch (error) {
        next(error)
    }
}

const getSkill = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const skill = await SkillService.getSkillById(workspaceId, skillId)
        return res.json(skill)
    } catch (error) {
        next(error)
    }
}

const updateSkill = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const body = req.body || {}
        const skill = await SkillService.updateSkill(workspaceId, skillId, {
            name: body.name,
            description: body.description,
            iconSrc: body.iconSrc,
            color: body.color
        })
        return res.json(skill)
    } catch (error) {
        next(error)
    }
}

const deleteSkill = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        await SkillService.deleteSkill(workspaceId, skillId)
        return res.status(StatusCodes.NO_CONTENT).send()
    } catch (error) {
        next(error)
    }
}

const publish = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const bundle = await SkillService.publish(workspaceId, skillId)
        const skillNodeCount = Object.values(bundle.entries).filter((e) => e.kind === 'skill').length
        const transitiveEdges = Object.values(bundle.dependencyGraph).reduce((acc, arr) => acc + arr.length, 0)
        return res.status(StatusCodes.ACCEPTED).json({
            bundleId: bundle.bundleId,
            nodeCount: Object.keys(bundle.entries).length,
            skillNodeCount,
            transitiveEdges,
            builtAt: bundle.builtAt
        })
    } catch (error) {
        next(error)
    }
}

const getBundle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const mode = (req.query.mode as string) === 'draft' ? 'draft' : 'published'
        const bundle =
            mode === 'draft'
                ? await SkillService.loadDraftBundle(workspaceId, skillId)
                : await SkillService.loadPublishedBundle(workspaceId, skillId)
        if (!bundle) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No bundle published yet')
        return res.json(bundle)
    } catch (error) {
        next(error)
    }
}

const validate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        // Draft compile surfaces broken refs as BROKEN_REF_MARKER; we run it and count them.
        const bundle = await SkillService.loadDraftBundle(workspaceId, skillId)
        let brokenCount = 0
        const broken: Array<{ nodeId: string; count: number }> = []
        for (const entry of Object.values(bundle.entries)) {
            if (entry.kind !== 'skill') continue
            const n = (entry.content.match(/\[SKILL_V2_BROKEN_REFERENCE\]/g) || []).length
            if (n > 0) {
                broken.push({ nodeId: entry.nodeId, count: n })
                brokenCount += n
            }
        }
        return res.json({ ok: brokenCount === 0, brokenCount, broken, bundleId: bundle.bundleId })
    } catch (error) {
        next(error)
    }
}

const graph = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const mode = (req.query.mode as string) === 'published' ? 'published' : 'draft'
        const dto = await SkillService.getGraph(workspaceId, skillId, mode)
        return res.json(dto)
    } catch (error) {
        next(error)
    }
}

const dependencies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const nodeId = typeof req.query.nodeId === 'string' ? req.query.nodeId : undefined
        const result = await SkillService.getDependencies(workspaceId, skillId, nodeId)
        return res.json(result)
    } catch (error) {
        next(error)
    }
}

// ------------- node-level -------------

const createNode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const body = req.body || {}
        const node = await SkillTreeService.createNode(workspaceId, skillId, {
            parentId: body.parentId ?? null,
            name: body.name,
            node_type: body.node_type,
            extension: body.extension,
            order: body.order,
            content: body.content,
            metadata: body.metadata
        })
        return res.status(StatusCodes.CREATED).json(node)
    } catch (error) {
        next(error)
    }
}

const getNode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const nodeId = requireNodeId(req)
        const out = await SkillTreeService.getNode(workspaceId, skillId, nodeId)
        return res.json(out)
    } catch (error) {
        next(error)
    }
}

const updateNode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const nodeId = requireNodeId(req)
        const body = req.body || {}
        const updated = await SkillTreeService.updateNode(workspaceId, skillId, nodeId, {
            name: body.name,
            parentId: body.parentId,
            order: body.order,
            content: body.content,
            metadata: body.metadata
        })
        return res.json(updated)
    } catch (error) {
        next(error)
    }
}

const deleteNode = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const nodeId = requireNodeId(req)
        const recursive = req.query.recursive === 'true' || req.query.recursive === '1'
        await SkillTreeService.deleteNode(workspaceId, skillId, nodeId, recursive)
        return res.status(StatusCodes.NO_CONTENT).send()
    } catch (error) {
        next(error)
    }
}

const uploadBinary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const nodeId = requireNodeId(req)

        // Accept either multipart (req.files) or base64 body (`{content, mime}`).
        const multerFiles = (req as any).files as Array<any> | undefined
        if (multerFiles && multerFiles.length) {
            const file = multerFiles[0]

            // When multer is configured with disk storage (the default for
            // LocalStorageProvider) it writes to a temp file and sets
            // `file.path`; `file.buffer` is undefined.  Fall back to reading
            // the temp file, then clean it up regardless of outcome.
            let buffer: Buffer
            if (Buffer.isBuffer(file.buffer)) {
                buffer = file.buffer
            } else if (file.path) {
                buffer = fs.readFileSync(file.path)
                try {
                    fs.unlinkSync(file.path)
                } catch {
                    /* best-effort cleanup */
                }
            } else {
                throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'No file data available (buffer and path both missing)')
            }

            const result = await SkillTreeService.uploadBinary(workspaceId, skillId, nodeId, buffer, file.mimetype)
            return res.json(result)
        }
        const body = req.body || {}
        if (typeof body.content === 'string') {
            const buf = Buffer.from(body.content, body.encoding === 'utf8' ? 'utf8' : 'base64')
            const result = await SkillTreeService.uploadBinary(workspaceId, skillId, nodeId, buf, body.mime)
            return res.json(result)
        }
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'No file provided')
    } catch (error) {
        next(error)
    }
}

const downloadBinary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const nodeId = requireNodeId(req)
        const result = await SkillTreeService.downloadBinary(workspaceId, skillId, nodeId)
        res.setHeader('Content-Type', result.mime)
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.node.name)}"`)
        return res.send(result.buffer)
    } catch (error) {
        next(error)
    }
}

const nodeDependencies = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workspaceId = resolveWorkspace(req)
        const skillId = requireSkillId(req)
        const nodeId = requireNodeId(req)
        const result = await SkillService.getDependencies(workspaceId, skillId, nodeId)
        return res.json(result)
    } catch (error) {
        next(error)
    }
}

export default {
    createSkill,
    listSkills,
    getSkill,
    updateSkill,
    deleteSkill,
    publish,
    getBundle,
    validate,
    dependencies,
    graph,
    createNode,
    getNode,
    updateNode,
    deleteNode,
    uploadBinary,
    downloadBinary,
    nodeDependencies
}
