import express from 'express'
import chatflowsController from '../../controllers/chatflows'
const router = express.Router()

// CREATE
router.post('/', chatflowsController.createChatflow)

// READ
router.get('/', chatflowsController.getAllChatflows)
router.get('/:id', chatflowsController.getSingleChatflow)
router.get('/apikey/:apiKey', chatflowsController.getSingleChatflowByApiKey)

// UPDATE
router.put('/:id', chatflowsController.updateChatflow)

// DELETE
router.delete('/:id', chatflowsController.removeSingleChatflow)

export default router
