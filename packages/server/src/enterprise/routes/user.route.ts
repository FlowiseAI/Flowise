import express from 'express'
import { UserController } from '../controllers/user.controller'
import { IdentityManager } from '../../IdentityManager'

const router = express.Router()
const userController = new UserController()

router.get('/', IdentityManager.checkUserIdMatch(), userController.read)
router.get('/test', userController.test)

router.post('/', userController.create)

router.put('/', userController.update)

export default router
