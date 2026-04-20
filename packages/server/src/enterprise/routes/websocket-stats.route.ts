import express from 'express'
import { WSStatsController } from '../controllers/wsStats.controller'

const router = express.Router()
const wsStatsController = new WSStatsController()

// GET /api/v1/ws/stats - Get WebSocket pool statistics
router.get('/stats', (req, res, next) => wsStatsController.getStats(req, res, next))

// GET /api/v1/ws/health - Get health status of WebSocket server
router.get('/health', (req, res, next) => wsStatsController.getHealth(req, res, next))

export default router
