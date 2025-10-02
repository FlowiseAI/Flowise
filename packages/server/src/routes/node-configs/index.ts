import nodeConfigsController from '../../controllers/node-configs'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// CREATE
router.post('/', ['public'], nodeConfigsController.getAllNodeConfigs)

export default router.getRouter()
