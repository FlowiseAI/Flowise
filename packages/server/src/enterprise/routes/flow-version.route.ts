import express from 'express'
import { FlowVersionController } from '../controllers/flow-version.controller'

const router = express.Router()
const flowVersionController = new FlowVersionController()

router.post('/:id/publish', flowVersionController.publishFlow)
router.get('/:id/versions', flowVersionController.getVersions)

export default router 