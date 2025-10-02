import getUploadFileController from '../../controllers/get-upload-file'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get('/', ['public'], getUploadFileController.streamUploadedFile)

export default router.getRouter()
