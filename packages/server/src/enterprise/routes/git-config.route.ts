import express from 'express'
import { GitConfigController } from '../controllers/git-config.controller'

const router = express.Router()
const gitConfigController = new GitConfigController()

router.get('/', gitConfigController.getAll)
router.get('/:id', gitConfigController.getById)
router.post('/', gitConfigController.create)
router.put('/:id', gitConfigController.update)
router.delete('/:id', gitConfigController.delete)
router.post('/test', gitConfigController.testConnection)

export default router 