import express from 'express'
import userManagementRouter from './user-management'
import loginActivityRouter from './LoginActivityRoutes'
import logger from '../../utils/logger'
import { testLoginActivity } from '../test-login-activity'

const customRouter = express.Router()

// Test endpoint to verify custom router is working
customRouter.get('/test', (req, res) => {
    logger.info('✅ Custom router test endpoint called')
    res.json({ message: 'Custom router is working - UPDATED!' })
})

// Test login activity endpoint  
customRouter.get('/testlogin', async (req, res) => {
    try {
        logger.info('🧪 Testing login activity endpoint called')
        console.log('🧪 Testing login activity endpoint called')
        await testLoginActivity()
        res.json({ message: 'Login activity test completed - check console logs' })
    } catch (error) {
        logger.error('❌ Test login activity failed:', error)
        console.error('❌ Test login activity failed:', error)
        res.status(500).json({ error: (error as any)?.message || 'Unknown error' })
    }
})

// Custom User Management Routes
customRouter.use(
    '/user-management',
    (req, res, next) => {
        logger.info('🎯 Custom user-management router called:', req.method, req.path)
        next()
    },
    userManagementRouter
)

// Custom Login Activity Routes
customRouter.use(
    '/login-activity',
    (req, res, next) => {
        logger.info('🎯 Custom login-activity router called:', req.method, req.path)
        next()
    },
    loginActivityRouter
)

// Debug all routes (should be last)
customRouter.use('*', (req, res, next) => {
    logger.info('🔍 Route debug - Method:', req.method, 'Path:', req.path, 'Original URL:', req.originalUrl)
    console.log('🔍 Route debug - Method:', req.method, 'Path:', req.path, 'Original URL:', req.originalUrl)
    res.status(404).json({ error: 'Route not found', path: req.path })
})

export default customRouter
