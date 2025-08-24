import express from 'express'
import chatflowsController from '../../controllers/chatflows'
import { checkAnyPermission, checkPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

// CREATE
router.post('/', checkAnyPermission('chatflows:create,chatflows:update'), chatflowsController.saveChatflow)

// READ
router.get('/', checkAnyPermission('chatflows:view,chatflows:update'), chatflowsController.getAllChatflows)
router.get(['/', '/:id'], checkAnyPermission('chatflows:view,chatflows:update,chatflows:delete'), chatflowsController.getChatflowById)
router.get(['/apikey/', '/apikey/:apikey'], chatflowsController.getChatflowByApiKey)

// UPDATE
router.put(['/', '/:id'], checkAnyPermission('chatflows:create,chatflows:update'), chatflowsController.updateChatflow)

// DELETE
router.delete(['/', '/:id'], checkPermission('chatflows:delete'), chatflowsController.deleteChatflow)

// CHECK FOR CHANGE
router.get('/has-changed/:id/:lastUpdatedDateTime', chatflowsController.checkIfChatflowHasChanged)

export default router
