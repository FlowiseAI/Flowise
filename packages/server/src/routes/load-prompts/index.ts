import express from 'express'
import loadPromptsController from '../../controllers/load-prompts'
const router = entitled.Router()

// CREATE
router.post('/', loadPromptsController.createPrompt)

export default router
