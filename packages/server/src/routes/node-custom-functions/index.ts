import express from 'express'
import nodesRouter from '../../controllers/nodes'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

// CREATE

// READ
router.post(
    '/',
    checkAnyPermission('chatflows:create,chatflows:update,agentflows:create,agentflows:update'),
    nodesRouter.executeCustomFunction
)

// UPDATE

// DELETE

export default router
