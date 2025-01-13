import express, { Router } from 'express'
import chatflowsController from '../../controllers/chatflows'
const router: Router = express.Router()

// CREATE
router.post('/', chatflowsController.saveChatflow)
router.post('/importchatflows', chatflowsController.importChatflows)

// READ
router.get('/', chatflowsController.getAllChatflows)
router.get(['/', '/:id'], chatflowsController.getChatflowById)
router.get(['/apikey/', '/apikey/:apikey'], chatflowsController.getChatflowByApiKey)
router.get('/public/all', chatflowsController.getAllPublicChatflows)
router.get('/admin/all', chatflowsController.getControlChatflowsOfAdmin)

// UPDATE
router.put(['/', '/:id'], chatflowsController.updateChatflow)

// DELETE
router.delete(['/', '/:id'], chatflowsController.deleteChatflow)

export default router
