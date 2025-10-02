import statsController from '../../controllers/stats'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// READ
router.get(['/', '/:id'], ['public'], statsController.getChatflowStats)

export default router.getRouter()
