import assistantsController from '../../controllers/assistants'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post(
    '/',
    [Entitlements.assistants.create],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    assistantsController.createAssistant
)

// READ
router.get(
    '/',
    [Entitlements.assistants.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    assistantsController.getAllAssistants
)
router.get(
    '/:id',
    [Entitlements.assistants.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    assistantsController.getAssistantById
)

// UPDATE
router.put(
    '/:id',
    [Entitlements.assistants.update],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    assistantsController.updateAssistant
)

// DELETE
router.delete(
    '/:id',
    [Entitlements.assistants.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    assistantsController.deleteAssistant
)

router.get('/components/chatmodels', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], assistantsController.getChatModels)
router.get('/components/docstores', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], assistantsController.getDocumentStores)
router.get('/components/tools', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], assistantsController.getTools)

// Generate Assistant Instruction
router.post(
    '/generate/instruction',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    assistantsController.generateAssistantInstruction
)

export default router
