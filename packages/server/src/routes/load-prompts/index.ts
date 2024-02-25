import express from 'express'
import loadPromptsController from '../../controllers/load-prompts'
const router = express.Router()

// CREATE
router.post('/', loadPromptsController.createPrompt)

// READ

// UPDATE

// DELETE

export default router
