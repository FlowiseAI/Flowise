import express from 'express'
import predictionsController from '../../controllers/predictions'

const router = express.Router()

// CREATE
router.post(['/', '/:id'], predictionsController.getRateLimiterMiddleware, predictionsController.createPrediction)

export default router
