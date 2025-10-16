import getUploadFileController from '../../controllers/get-upload-file'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// READ
router.get('/', [Entitlements.unspecified], getUploadFileController.streamUploadedFile)

export default router.getRouter()
