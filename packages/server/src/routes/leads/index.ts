import express from 'express'
import leadsController from '../../controllers/leads'
const router = express.Router()

// CREATE
router.post('/', leadsController.createLeadInChatflow)

// READ
router.get(['/', '/:id'], leadsController.getAllLeadsForChatflow)

export default router
