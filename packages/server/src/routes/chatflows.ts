import express from 'express'
import enforceAbility from '../middlewares/authentication/enforceAbility'
import chatflowsController from '../controllers/chatflows'

const router = express.Router()

router.get('/', enforceAbility('ChatFlow'), chatflowsController.getAllChatflows)
router.get('/:id', enforceAbility('ChatFlow'), chatflowsController.getChatflowById)
router.post('/', enforceAbility('ChatFlow'), chatflowsController.saveChatflow)
router.put('/:id', enforceAbility('ChatFlow'), chatflowsController.updateChatflow)
router.delete('/:id', enforceAbility('ChatFlow'), chatflowsController.deleteChatflow)

export default router
