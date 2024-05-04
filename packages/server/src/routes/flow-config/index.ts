import express from 'express'
import flowConfigsController from '../../controllers/flow-configs'
const router = express.Router()

// CREATE

// READ
router.get(['/', '/:id'], flowConfigsController.getSingleFlowConfig)

// UPDATE

// DELETE

export default router
