import assistantsController from '../../controllers/assistants'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// CREATE
router.post('/', ['assistants:create'], assistantsController.createAssistant)

// READ
router.get('/', ['assistants:view'], assistantsController.getAllAssistants)
router.get('/:id', ['assistants:view'], assistantsController.getAssistantById)

// UPDATE
router.put('/:id', ['assistants:update'], assistantsController.updateAssistant)

// DELETE
router.delete('/:id', ['assistants:delete'], assistantsController.deleteAssistant)

router.get('/components/chatmodels', ['public'], assistantsController.getChatModels)
router.get('/components/docstores', ['public'], assistantsController.getDocumentStores)
router.get('/components/tools', ['public'], assistantsController.getTools)

// Generate Assistant Instruction
router.post('/generate/instruction', ['public'], assistantsController.generateAssistantInstruction)

export default router.getRouter()
