import express, { Router } from 'express'
import flowConfigsController from '../../controllers/flow-configs'
const router: Router = express.Router()

// CREATE

// READ
router.get(['/', '/:id'], flowConfigsController.getSingleFlowConfig)

// UPDATE

// DELETE

export default router
