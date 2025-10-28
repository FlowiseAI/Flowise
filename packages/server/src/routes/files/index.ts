import filesController from '../../controllers/files'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], filesController.getAllFiles)

// DELETE
router.delete('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], filesController.deleteFile)

export default router.getRouter()
