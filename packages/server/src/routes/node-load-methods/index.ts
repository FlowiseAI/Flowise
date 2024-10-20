import express from 'express'
import nodesRouter from '../../controllers/nodes'
const router = express.Router()

router.post(['/', '/:name'], nodesRouter.getSingleNodeAsyncOptions)

export default router
