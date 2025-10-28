import toolsController from '../../controllers/tools'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.tools.create], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], toolsController.createTool)

// READ
router.get('/', [Entitlements.tools.view], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], toolsController.getAllTools)
router.get('/:id', [Entitlements.tools.view], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], toolsController.getToolById)

// UPDATE
router.put('/:id', [Entitlements.tools.update], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], toolsController.updateTool)

// DELETE
router.delete('/:id', [Entitlements.tools.delete], [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY], toolsController.deleteTool)

export default router
