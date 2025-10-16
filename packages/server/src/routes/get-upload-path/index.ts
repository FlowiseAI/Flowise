import getUploadPathController from '../../controllers/get-upload-path'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], getUploadPathController.getPathForUploads)

export default router
