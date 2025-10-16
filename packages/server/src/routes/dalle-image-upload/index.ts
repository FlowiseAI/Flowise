import express from 'express'
import dalleImageUploadController from '../../controllers/dalle-image-upload'
import rateLimit from 'express-rate-limit'

const router = express.Router()

// Define rate limiter: maximum of 100 requests per 15 minutes
const archiveRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.'
})

// POST
router.post('/', dalleImageUploadController.uploadDalleImage)

// GET
router.get('/archive', archiveRateLimiter, dalleImageUploadController.listArchivedImages)

export default router
