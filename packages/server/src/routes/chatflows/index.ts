import chatflowsController from '../../controllers/chatflows'
import { entitled } from '../../services/entitled-router'

const router = entitled.Router()

// CREATE
router.post('/', ['chatflows:create'], chatflowsController.saveChatflow)

// READ
router.get('/', ['chatflows:view'], chatflowsController.getAllChatflows)
router.get('/:id', ['chatflows:view'], chatflowsController.getChatflowById)
router.get('/apikey/:apikey', ['public'], chatflowsController.getChatflowByApiKey)

// UPDATE
router.put('/:id', ['chatflows:update'], chatflowsController.updateChatflow)

// DELETE
router.delete('/:id', ['chatflows:delete'], chatflowsController.deleteChatflow)

// CHECK FOR CHANGE
router.get('/has-changed/:id/:lastUpdatedDateTime', ['public'], chatflowsController.checkIfChatflowHasChanged)

export default router.getRouter()
