import express from 'express'
import chatflowVersionsController from '../../controllers/chatflow-versions'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'

const router = express.Router()

// GET all versions for a chatflow
router.get(
    '/:id/versions',
    checkAnyPermission('chatflows:view,chatflows:update,agentflows:view,agentflows:update'),
    chatflowVersionsController.getAllVersions
)

// GET specific version
router.get(
    '/:id/versions/:version',
    checkAnyPermission('chatflows:view,chatflows:update,agentflows:view,agentflows:update'),
    chatflowVersionsController.getVersion
)

// CREATE new version
router.post(
    '/:id/versions',
    checkAnyPermission('chatflows:create,chatflows:update,agentflows:create,agentflows:update'),
    chatflowVersionsController.createVersion
)

// UPDATE version
router.put('/:id/versions/:version', checkAnyPermission('chatflows:update,agentflows:update'), chatflowVersionsController.updateVersion)

// SET active version
router.put('/:id/active-version', checkAnyPermission('chatflows:update,agentflows:update'), chatflowVersionsController.setActiveVersion)

// DELETE version
router.delete('/:id/versions/:version', checkAnyPermission('chatflows:delete,agentflows:delete'), chatflowVersionsController.deleteVersion)

export default router
