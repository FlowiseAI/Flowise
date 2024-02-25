import express from 'express'
import nodesRouter from '../../controllers/nodes'
const router = express.Router()

// CREATE

// READ
router.get('/:name', nodesRouter.getSingleNodeAsyncOptions)

// UPDATE

// DELETE

export default router
