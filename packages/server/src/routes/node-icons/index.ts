import express, { Router } from 'express'
import nodesController from '../../controllers/nodes'
const router: Router = express.Router()

// CREATE

// READ
router.get(['/', '/:name'], nodesController.getSingleNodeIcon)

// UPDATE

// DELETE

export default router
