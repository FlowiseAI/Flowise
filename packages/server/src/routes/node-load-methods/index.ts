import express, { Router } from 'express'
import nodesRouter from '../../controllers/nodes'
const router: Router = express.Router()

router.post(['/', '/:name'], nodesRouter.getSingleNodeAsyncOptions)

export default router
