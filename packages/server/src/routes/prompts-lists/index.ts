import promptsListController from '../../controllers/prompts-lists'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], promptsListController.createPromptsList)

export default router
