import chatflowsController from '../../controllers/chatflows'
import { entitled } from '../../services/entitled-router'
import { Entitlements } from '../../enterprise/rbac/Entitlements'
import { AuthenticationStrategy } from '../../enterprise/auth/AuthenticationStrategy'

const router = entitled.Router()

// CREATE
router.post(
    '/',
    [Entitlements.chatflows.create],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    chatflowsController.saveChatflow
)

// READ
router.get(
    '/',
    [Entitlements.chatflows.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    chatflowsController.getAllChatflows
)
router.get(
    '/:id',
    [Entitlements.chatflows.view],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    chatflowsController.getChatflowById
)
router.get('/apikey/:apikey', [Entitlements.unspecified], [AuthenticationStrategy.PUBLIC], chatflowsController.getChatflowByApiKey)

// UPDATE
router.put(
    '/:id',
    [Entitlements.chatflows.update],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    chatflowsController.updateChatflow
)

// DELETE
router.delete(
    '/:id',
    [Entitlements.chatflows.delete],
    [AuthenticationStrategy.JWT, AuthenticationStrategy.API_KEY],
    chatflowsController.deleteChatflow
)

// CHECK FOR CHANGE
router.get(
    '/has-changed/:id/:lastUpdatedDateTime',
    [Entitlements.unspecified],
    [AuthenticationStrategy.PUBLIC],
    chatflowsController.checkIfChatflowHasChanged
)

export default router
