import express from 'express'
import openaiRealTimeController from '../../controllers/openai-realtime'

const router = express.Router()

// GET
router.get(['/', '/:id'], openaiRealTimeController.getAgentTools)

// EXECUTE
router.post(['/', '/:id'], openaiRealTimeController.executeAgentTool)

export default router
