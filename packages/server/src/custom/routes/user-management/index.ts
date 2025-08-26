import express from 'express'
import { CustomUserController } from '../../controllers/user-management'
import logger from '../../../utils/logger'

const router = express.Router()

// GET /api/v1/custom/user-management
router.get('/', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const controller = new CustomUserController()
    await controller.getAllUsers(req, res, next)
})

// GET /api/v1/custom/user-management/:id
router.get('/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const controller = new CustomUserController()
    await controller.getUserById(req, res, next)
})

// POST /api/v1/custom/user-management
router.post('/', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('🛣️ Router: POST /custom/user-management called')
    try {
        const controller = new CustomUserController()
        logger.info('🎮 Controller created, calling createUser...')
        await controller.createUser(req, res, next)
    } catch (error) {
        logger.error('❌ Router error:', error)
        next(error)
    }
})

// PUT /api/v1/custom/user-management/:id
router.put('/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const controller = new CustomUserController()
    await controller.updateUser(req, res, next)
})

// DELETE /api/v1/custom/user-management/:id
router.delete('/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const controller = new CustomUserController()
    await controller.deleteUser(req, res, next)
})

export default router
