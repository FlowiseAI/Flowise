import express from 'express'
import nodesController from '../../controllers/nodes'
const router = express.Router()

// READ
router.get('/', nodesController.getAllNodes)
router.get('/:name', nodesController.getNodeByName)

export default router
