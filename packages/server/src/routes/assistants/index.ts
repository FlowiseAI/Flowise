import assistantsController from '../../controllers/assistants'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.assistants.create], assistantsController.createAssistant)

// READ
router.get('/', [Entitlements.assistants.view], assistantsController.getAllAssistants)
router.get('/:id', [Entitlements.assistants.view], assistantsController.getAssistantById)

// UPDATE
router.put('/:id', [Entitlements.assistants.update], assistantsController.updateAssistant)

// DELETE
router.delete('/:id', [Entitlements.assistants.delete], assistantsController.deleteAssistant)

router.get('/components/chatmodels', [Entitlements.unspecified], assistantsController.getChatModels)
router.get('/components/docstores', [Entitlements.unspecified], assistantsController.getDocumentStores)
router.get('/components/tools', [Entitlements.unspecified], assistantsController.getTools)

// Generate Assistant Instruction
router.post('/generate/instruction', [Entitlements.unspecified], assistantsController.generateAssistantInstruction)

export default router
