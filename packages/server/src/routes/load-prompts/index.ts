import express, { Router } from 'express'
import loadPromptsController from '../../controllers/load-prompts'
const router: Router = express.Router()

// CREATE
router.post('/', loadPromptsController.createPrompt)

export default router
