import promptsListController from '../../controllers/prompts-lists'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// CREATE
router.post('/', ['public'], promptsListController.createPromptsList)

export default router.getRouter()
