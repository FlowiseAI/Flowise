import loadPromptsController from '../../controllers/load-prompts'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], loadPromptsController.createPrompt)

export default router
