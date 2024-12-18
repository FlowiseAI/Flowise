import express, { Router } from 'express'
import internalPredictionsController from '../../controllers/internal-predictions'
const router: Router = express.Router()

// CREATE
router.post(['/', '/:id'], internalPredictionsController.createInternalPrediction)

export default router
