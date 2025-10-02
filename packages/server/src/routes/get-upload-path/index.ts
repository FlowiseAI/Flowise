
import getUploadPathController from '../../controllers/get-upload-path';
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get('/', ['public'], getUploadPathController.getPathForUploads);

export default router.getRouter();
