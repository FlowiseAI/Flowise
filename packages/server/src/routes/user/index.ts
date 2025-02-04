import express, { Router } from 'express'

import userController from '../../controllers/user'

const router: Router = express.Router()

// User routes
router.get('/group-users', userController.getAllGroupUsers)
router.post('/group-users/add', userController.addGroupUser)
router.delete('/group-users/delete', userController.deleteGroupUser)
router.get('/group-users/group', userController.getUsersByGroup)
router.get('/user/group-users/all', userController.getAllUsersGroupedByGroupname)
router.delete('/remove-user', userController.removeUser)
router.post('/register', userController.registerUser)
router.post('/login', userController.loginUser)
router.get('/:id', userController.getUserById)

export default router
