import logController from '../../controllers/log'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get('/', ['logs:view'], logController.getLogs)

export default router.getRouter()
