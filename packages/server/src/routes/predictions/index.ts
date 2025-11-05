import express from 'express'
import predictionsController from '../../controllers/predictions'
import { getMulterStorage } from '../../utils'

const router = express.Router()

// NOTE: extractChatflowId function in XSS.ts extracts the chatflow ID from the prediction URL.
// It assumes the URL format is /prediction/{chatflowId}. Make sure to update the function if the URL format changes.
// CREATE
router.post(
    ['/', '/:id'],
    getMulterStorage().array('files'),
    predictionsController.getRateLimiterMiddleware,
    predictionsController.createPrediction
)

export default router
