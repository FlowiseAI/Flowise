import chatflowsController from '../../controllers/chatflows'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'

const router = entitled.Router()

// CREATE
router.post('/', [Entitlements.chatflows.create], chatflowsController.saveChatflow)

// READ
router.get('/', [Entitlements.chatflows.view], chatflowsController.getAllChatflows)
router.get('/:id', [Entitlements.chatflows.view], chatflowsController.getChatflowById)
router.get('/apikey/:apikey', [Entitlements.unspecified], chatflowsController.getChatflowByApiKey)

// UPDATE
router.put('/:id', [Entitlements.chatflows.update], chatflowsController.updateChatflow)

// DELETE
router.delete('/:id', [Entitlements.chatflows.delete], chatflowsController.deleteChatflow)

// CHECK FOR CHANGE
router.get('/has-changed/:id/:lastUpdatedDateTime', [Entitlements.unspecified], chatflowsController.checkIfChatflowHasChanged)

export default router.getRouter()
