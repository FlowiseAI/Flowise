import express from 'express'
import { UserController } from '../controllers/user.controller'

const router = entitled.Router()
const userController = new UserController()

router.get('/', userController.read)
router.get('/test', userController.test)

router.post('/', userController.create)

router.put('/', userController.update)

export default router
