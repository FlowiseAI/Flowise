import express from 'express'
import { FlowVersionController } from '../controllers/flow-version.controller'

const router = express.Router()
const flowVersionController = new FlowVersionController()

router.post('/:id/publish', flowVersionController.publishFlow)
router.get('/:id/versions', flowVersionController.getVersions)

// MAKE DRAFT
router.put('/:id/make-draft/:commitId', flowVersionController.makeDraft)
router.get('/check', flowVersionController.check)
export default router 