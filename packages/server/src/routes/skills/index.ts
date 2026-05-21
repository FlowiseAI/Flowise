import express from 'express'
import skillsController from '../../controllers/skills'
import { checkAnyPermission, checkPermission } from '../../enterprise/rbac/PermissionCheck'
import { getMulterStorage } from '../../utils'

const router = express.Router()

// Piggy-back on the existing `tools:*` permissions — is a new incarnation of Skills
// and Flowise's RBAC bucket for skills today lives under `tools:*`. When v1 is retired
// this can move to a dedicated `skills:*` bucket.

// ================= skill-level =================

router.post('/', checkPermission('tools:create'), skillsController.createSkill)
router.get('/', checkPermission('tools:view'), skillsController.listSkills)

router.get('/:skillId', checkPermission('tools:view'), skillsController.getSkill)
router.put('/:skillId', checkAnyPermission('tools:update,tools:create'), skillsController.updateSkill)
router.delete('/:skillId', checkPermission('tools:delete'), skillsController.deleteSkill)

router.post('/:skillId/publish', checkAnyPermission('tools:update,tools:create'), skillsController.publish)
router.get('/:skillId/bundle', checkPermission('tools:view'), skillsController.getBundle)
router.post('/:skillId/validate', checkPermission('tools:view'), skillsController.validate)
router.get('/:skillId/dependencies', checkPermission('tools:view'), skillsController.dependencies)
router.get('/:skillId/graph', checkPermission('tools:view'), skillsController.graph)

// ================= node-level =================

router.post('/:skillId/nodes', checkAnyPermission('tools:update,tools:create'), skillsController.createNode)
router.get('/:skillId/nodes/:nodeId', checkPermission('tools:view'), skillsController.getNode)
router.put('/:skillId/nodes/:nodeId', checkAnyPermission('tools:update,tools:create'), skillsController.updateNode)
router.delete('/:skillId/nodes/:nodeId', checkPermission('tools:delete'), skillsController.deleteNode)
router.post(
    '/:skillId/nodes/:nodeId/upload',
    checkAnyPermission('tools:update,tools:create'),
    getMulterStorage().array('files'),
    skillsController.uploadBinary
)
router.get('/:skillId/nodes/:nodeId/download', checkPermission('tools:view'), skillsController.downloadBinary)
router.get('/:skillId/nodes/:nodeId/dependencies', checkPermission('tools:view'), skillsController.nodeDependencies)

export default router
