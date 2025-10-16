import promptsListController from '../../controllers/prompts-lists'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.unspecified], promptsListController.createPromptsList)

export default router.getRouter()
