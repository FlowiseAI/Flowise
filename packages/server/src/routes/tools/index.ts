import express from 'express'
import toolsController from '../../controllers/tools'

const router = express.Router()

// CREATE
router.post('/', toolsController.createTool)

// READ
router.get('/', toolsController.getAllTools)
router.get(['/', '/:id'], toolsController.getToolById)

// UPDATE
router.put(['/', '/:id'], toolsController.updateTool)

// DELETE
router.delete(['/', '/:id'], toolsController.deleteTool)

export default router
