import loadPromptsController from '../../controllers/load-prompts'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.unspecified], loadPromptsController.createPrompt)

export default router
