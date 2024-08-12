import express from 'express'
import plansController from '../../controllers/plans'
const router = express.Router()

router.get('/', plansController.getCurrentPlan)
router.get('/history', plansController.getPlanHistory)

export default router
