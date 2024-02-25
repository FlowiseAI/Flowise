import express from 'express'
import nodesController from '../../controllers/nodes'
const router = express.Router()

// CREATE

// READ
router.get('/', nodesController.getAllNodes)
router.get('/:name', nodesController.getSingleNode)

// UPDATE

// DELETE

export default router
