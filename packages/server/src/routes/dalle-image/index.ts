import express from 'express'
import dalleImageController from '../../controllers/dalle-image'
import rateLimit from 'express-rate-limit'

const router = express.Router()

// Define rate limiter: maximum of 50 requests per 15 minutes for image generation
const generateRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: 'Too many image generation requests,please try again later.'
})

// Define rate limiter: maximum of 100 requests per 15 minutes for archive
const archiveRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.'
})

// POST - Generate images (combines OpenAI call + upload)
// Note: User context will be provided by Next.js proxy with proper authentication
router.post('/generate', generateRateLimiter, dalleImageController.generateDalleImage)

// POST - Upload image only (existing functionality)
router.post('/upload', dalleImageController.uploadDalleImage)

// GET - List archived images
router.get('/archive', archiveRateLimiter, dalleImageController.listArchivedImages)

export default router
