import agentflowv2GeneratorController from '../../controllers/agentflowv2-generator'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
const router = entitled.Router()

router.post('/generate', [Entitlements.unspecified], agentflowv2GeneratorController.generateAgentflowv2)

export default router
