import express from 'express'
import toolsController from '../../controllers/tools'
import enforceAbility from '../../middlewares/authentication/enforceAbility'

const router = express.Router()

// CREATE
router.post('/', enforceAbility('Tool'), toolsController.createTool)

// READ
router.get('/', enforceAbility('Tool'), toolsController.getAllTools)
router.get(['/', '/:id'], enforceAbility('Tool'), toolsController.getToolById)

// UPDATE
router.put(['/', '/:id'], enforceAbility('Tool'), toolsController.updateTool)

// DELETE
router.delete(['/', '/:id'], enforceAbility('Tool'), toolsController.deleteTool)

export default router
