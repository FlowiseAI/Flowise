import filesController from '../../controllers/files'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], filesController.getAllFiles)

// DELETE
router.delete('/', [Entitlements.unspecified], filesController.deleteFile)

export default router
