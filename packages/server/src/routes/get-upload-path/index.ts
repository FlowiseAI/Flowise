import getUploadPathController from '../../controllers/get-upload-path'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { entitled } from '../../services/entitled-router'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], getUploadPathController.getPathForUploads)

export default router
