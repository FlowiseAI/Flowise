import express from 'express'
import passport from 'passport'
import atlassianAuthController from '../../controllers/atlassian-auth'

const router = express.Router()

// GET /api/v1/atlassian-auth/
router.get('/', atlassianAuthController.authenticate)

// GET /api/v1/atlassian-auth/callback
router.get('/callback', passport.authenticate('atlassian-dynamic', { session: false }), atlassianAuthController.atlassianAuthCallback)

// GET /api/v1/atlassian-auth/mcp-initialize
router.get('/mcp-initialize', atlassianAuthController.mcpInitialize)

export default router
