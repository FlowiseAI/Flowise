import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getInstance } from '../../index'

export class WSStatsController {
    /**
     * Get WebSocket pool statistics
     * Only accessible by authenticated users (enterprise feature)
     */
    public async getStats(req: Request, res: Response, next: NextFunction) {
        try {
            const appServer = getInstance()
            if (!appServer) {
                throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Server instance not available')
            }

            if (!appServer.wsServer) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'WebSocket server not initialized')
            }

            const stats = appServer.wsServer.getPoolStats()

            return res.status(StatusCodes.OK).json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            })
        } catch (error) {
            next(error)
        }
    }

    /**
     * Get health status of WebSocket server
     */
    public async getHealth(req: Request, res: Response, next: NextFunction) {
        try {
            const appServer = getInstance()
            if (!appServer || !appServer.wsServer) {
                throw new InternalFlowiseError(StatusCodes.SERVICE_UNAVAILABLE, 'WebSocket server not initialized')
            }

            const stats = appServer.wsServer.getPoolStats()
            const utilizationPercent = parseFloat(stats.utilizationPercent)

            // Define health thresholds
            const isHealthy = utilizationPercent < 80 // Under 80% capacity
            const status = utilizationPercent >= 95 ? 'critical' : utilizationPercent >= 80 ? 'warning' : 'healthy'

            return res.status(StatusCodes.OK).json({
                success: true,
                status,
                healthy: isHealthy,
                utilization: `${stats.utilizationPercent}%`,
                activeConnections: stats.activeConnections,
                maxConnections: stats.maxConnections,
                timestamp: new Date().toISOString()
            })
        } catch (error) {
            next(error)
        }
    }
}
