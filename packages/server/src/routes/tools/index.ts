import toolsController from '../../controllers/tools'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.tools.create], toolsController.createTool)

// READ
router.get('/', [Entitlements.tools.view], toolsController.getAllTools)
router.get('/:id', [Entitlements.tools.view], toolsController.getToolById)

// UPDATE
router.put('/:id', [Entitlements.tools.update], toolsController.updateTool)

// DELETE
router.delete('/:id', [Entitlements.tools.delete], toolsController.deleteTool)

export default router.getRouter()
