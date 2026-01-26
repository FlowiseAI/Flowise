const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Mock data - In production, this would come from your auth system
const mockUserContext = {
    permissions: ['read:chatflows', 'write:chatflows', 'execute:chatflows'],
    features: ['agentflow', 'chatflow', 'tools'],
    activeOrganizationId: 'org_demo_123',
    activeOrganizationSubscriptionId: 'sub_demo_456',
    activeOrganizationCustomerId: 'cus_demo_789',
    activeOrganizationProductId: 'prod_demo_abc',
    isOrganizationAdmin: false,
    activeWorkspaceId: 'workspace_demo_xyz',
    activeWorkspace: 'Demo Workspace'
}

app.post('/api/generate-token', (req, res) => {
    try {
        // Retrieve Octopaas token from cookies (developer account) req.cookies['octopaas_token']
        const octopaasToken = 'some-mock-token'

        if (!octopaasToken) {
            return res.status(401).json({ message: 'No Octopaas token found' })
        }

        // Token expires in 1 hour
        const expirationTime = Math.floor(Date.now() / 1000) + 3600

        res.json({
            token: octopaasToken,
            expiresAt: expirationTime,
            user: mockUserContext
        })
    } catch (error) {
        console.error('Error generating token:', error)
        res.status(500).json({ error: 'Failed to generate token' })
    }
})

app.post('/api/publish', (req, res) => {
    try {
        const { token } = req.body
    } catch (error) {
        console.error('Error publishing:', error)
        res.status(500).json({ error: 'Failed to publish' })
    }
})

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
})

app.listen(PORT, () => {
    console.log(`Demo backend server running on http://localhost:${PORT}`)
})
