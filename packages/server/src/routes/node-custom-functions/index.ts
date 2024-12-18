import express, { Router } from 'express'
import nodesRouter from '../../controllers/nodes'
const router: Router = express.Router()

// CREATE

// READ
router.post('/', nodesRouter.executeCustomFunction)

// UPDATE

// DELETE

export default router
