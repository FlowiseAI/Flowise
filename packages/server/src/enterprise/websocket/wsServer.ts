import WebSocket from 'ws'
import { IncomingMessage } from 'http'
import jwt from 'jsonwebtoken'
import { WSRouter } from './wsRouter'
import { AuthenticatedWebSocket } from './types'
import { WSPoolManager } from './wsPoolManager'
import logger from '../../utils/logger'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { IAssignedWorkspace, LoggedInUser } from '../Interface.Enterprise'
import { decryptToken } from '../utils/tempTokenUtils'
import { OrganizationUserService } from '../services/organization-user.service'
import { OrganizationService } from '../services/organization.service'
import { WorkspaceUserService } from '../services/workspace-user.service'
import { GeneralRole } from '../database/entities/role.entity'
import { RoleService } from '../services/role.service'
import { checkMessageSize } from '../utils/validation'

// JWT configuration (same as passport middleware)
const jwtAudience = process.env.JWT_AUDIENCE || 'AUDIENCE'
const jwtIssuer = process.env.JWT_ISSUER || 'ISSUER'
const jwtAuthTokenSecret = process.env.JWT_AUTH_TOKEN_SECRET || 'auth_token'

export class WSServer {
    private wss: WebSocket.Server
    private router: WSRouter
    private poolManager: WSPoolManager

    constructor(server: any) {
        this.wss = new WebSocket.Server({ server })
        this.router = new WSRouter()
        this.poolManager = WSPoolManager.getInstance()
        this.initializeConnectionHandling()
    }

    /**
     * Extract sessionId from WebSocket upgrade request cookies
     */
    private extractSessionId(request: IncomingMessage): string | null {
        try {
            if (request.headers.cookie) {
                const sessionId = request.headers.cookie
                    .split(';')
                    .map((c) => c.trim())
                    .find((c) => c.startsWith('ws_session_id='))
                    ?.split('=')[1]
                return sessionId || null
            }
            return null
        } catch (error) {
            logger.error('❌ [WebSocket]: Error extracting sessionId:', error)
            return null
        }
    }

    /**
     * Extract JWT token from WebSocket upgrade request
     * Supports: Cookie, Query parameter, or Authorization header
     */
    private extractToken(request: IncomingMessage): string | null {
        try {
            // Method 1: Extract from Cookie header
            if (request.headers.cookie) {
                const jwt = request.headers.cookie
                    .split(';')
                    .map((c) => c.trim())
                    .find((c) => c.startsWith('token='))
                    ?.split('=')[1]
                return jwt || null
            }

            // Method 2: Extract from query parameter (fallback for some clients)
            const url = new URL(request.url || '', `http://${request.headers.host}`)
            const tokenParam = url.searchParams.get('token')
            if (tokenParam) {
                return tokenParam
            }

            // Method 3: Extract from Authorization header
            const authHeader = request.headers.authorization
            if (authHeader && authHeader.startsWith('Bearer ')) {
                return authHeader.substring(7)
            }

            return null
        } catch (error) {
            logger.error('❌ [WebSocket]: Error extracting token:', error)
            return null
        }
    }

    /**
     * Verify JWT token and return user
     */
    private async verifyToken(token: string): Promise<LoggedInUser | null> {
        try {
            const decoded = jwt.verify(token, jwtAuthTokenSecret, {
                audience: jwtAudience,
                issuer: jwtIssuer
            }) as jwt.JwtPayload

            // Check if token is expired
            if (decoded.exp && Date.now() >= decoded.exp * 1000) {
                logger.warn('⚠️ [WebSocket]: Token expired')
                return null
            }

            // Decrypt the meta information including (`user.id:user.activeWorkspaceId`)
            const meta = decryptToken(decoded.meta)
            if (!meta) {
                logger.warn('⚠️ [WebSocket]: Failed to decrypt token meta')
                return null
            }
            const ids = meta.split(':')
            if (ids.length !== 2 || decoded.id !== ids[0]) {
                logger.warn('⚠️ [WebSocket]: Token meta does not match user ID')
                return null
            }
            const userId = ids[0]
            const activeWorkspaceId = ids[1]

            // Validate the userId from app service
            const loggedInUser = await this.getLoggedInUser(userId, activeWorkspaceId)
            if (!loggedInUser) {
                logger.warn('⚠️ [WebSocket]: User not found or inactive')
                return null
            }

            return {
                ...loggedInUser,
                name: decoded.username
            }
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                logger.warn('⚠️ [WebSocket]: Token expired')
            } else if (error instanceof jwt.JsonWebTokenError) {
                logger.warn('⚠️ [WebSocket]: Invalid token')
            } else {
                logger.error('❌ [WebSocket]: Error verifying token:', error)
            }
            return null
        }
    }

    private async getLoggedInUser(userId: string, workspaceId: string) {
        let queryRunner
        try {
            const appServer = getRunningExpressApp()
            queryRunner = appServer.AppDataSource.createQueryRunner()
            const organizationUserService = new OrganizationUserService()
            const { organizationUser } = await organizationUserService.readOrganizationUserByWorkspaceIdUserId(
                workspaceId,
                userId,
                queryRunner
            )
            if (!organizationUser) {
                return null
            }

            const workspaceUserService = new WorkspaceUserService()
            const workspaceUsers = await workspaceUserService.readWorkspaceUserByUserId(organizationUser.userId, queryRunner)
            const assignedWorkspaces: IAssignedWorkspace[] = workspaceUsers.map((workspaceUser) => {
                return {
                    id: workspaceUser.workspace.id,
                    name: workspaceUser.workspace.name,
                    role: workspaceUser.role?.name,
                    organizationId: workspaceUser.workspace.organizationId
                } as IAssignedWorkspace
            })

            let roleService = new RoleService()
            const ownerRole = await roleService.readGeneralRoleByName(GeneralRole.OWNER, queryRunner)
            const role = await roleService.readRoleById(organizationUser.roleId, queryRunner)
            if (!role) {
                return null
            }

            const orgService = new OrganizationService()
            const organization = await orgService.readOrganizationById(organizationUser.organizationId, queryRunner)
            if (!organization) {
                return null
            }
            const subscriptionId = organization.subscriptionId as string
            const customerId = organization.customerId as string
            const features = await appServer.identityManager.getFeaturesByPlan(subscriptionId)
            const productId = await appServer.identityManager.getProductIdFromSubscription(subscriptionId)
            const loggedInUser: LoggedInUser = {
                id: userId,
                email: organizationUser.user?.email,
                name: organizationUser.user?.name,
                roleId: organizationUser.roleId,
                activeOrganizationId: organization.id,
                activeOrganizationSubscriptionId: subscriptionId,
                activeOrganizationCustomerId: customerId,
                activeOrganizationProductId: productId,
                isOrganizationAdmin: organizationUser.roleId === ownerRole.id,
                activeWorkspaceId: workspaceId,
                activeWorkspace: assignedWorkspaces.find((ws) => ws.id === workspaceId)?.name || '',
                assignedWorkspaces,
                permissions: [...JSON.parse(role.permissions)],
                features
            }
            return loggedInUser
        } catch (error) {
            logger.error('❌ [WebSocket]: Error creating query runner:', error)
            return null
        } finally {
            if (queryRunner) {
                await queryRunner.release()
            }
        }
    }

    /**
     * Authenticate WebSocket connection
     */
    private async authenticateConnection(request: IncomingMessage): Promise<LoggedInUser | null> {
        // Extract token from request
        const token = this.extractToken(request)
        if (!token) {
            logger.warn('⚠️ [WebSocket]: No authentication token provided')
            return null
        }

        // Verify token and get user
        const user = await this.verifyToken(token)
        if (!user) {
            logger.warn('⚠️ [WebSocket]: Token verification failed')
            return null
        }

        // Check license if enterprise
        const appServer = getRunningExpressApp()
        if (appServer.identityManager?.isEnterprise() && !appServer.identityManager?.isLicenseValid()) {
            logger.warn('⚠️ [WebSocket]: License invalid or expired')
            return null
        }

        return user
    }

    private initializeConnectionHandling() {
        this.wss.on('connection', async (socket: AuthenticatedWebSocket, request: IncomingMessage) => {
            // Authenticate the connection
            const user = await this.authenticateConnection(request)

            if (!user) {
                logger.warn('🚫 [WebSocket]: Unauthorized connection attempt')
                socket.send(
                    JSON.stringify({
                        type: 'auth-error',
                        message: 'Authentication required. Please log in and try again.'
                    })
                )
                socket.close(4401, 'Unauthorized')
                return
            }

            // Extract sessionId from cookie
            const sessionId = this.extractSessionId(request)
            if (sessionId) {
                socket.sessionId = sessionId
            } else {
                // Generate fallback sessionId if not provided by client
                socket.sessionId = `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                logger.warn(`⚠️ [WebSocket]: No sessionId in cookie, generated fallback: ${socket.sessionId}`)
            }

            // Check if connection can be accepted (max connections check)
            const connectionCheck = this.poolManager.canAcceptConnection(user.id)
            if (!connectionCheck.allowed) {
                logger.warn(`🚫 [WebSocket]: Connection rejected for user ${user.id}: ${connectionCheck.reason}`)
                socket.send(
                    JSON.stringify({
                        type: 'connection-error',
                        message: connectionCheck.reason
                    })
                )
                socket.close(4429, 'Too Many Connections')
                return
            }

            // Attach authenticated user to socket
            socket.user = user

            // Register connection in pool manager
            await this.poolManager.addConnection(socket)

            // Send connection confirmation with sessionId
            socket.send(
                JSON.stringify({
                    type: 'connection-established',
                    sessionId: socket.sessionId,
                    userId: user.id
                })
            )

            logger.info(`🔌 [WebSocket]: Client authenticated - User: ${user.name || user.id}, SessionId: ${socket.sessionId}`)

            socket.on('message', async (data: WebSocket.Data) => {
                try {
                    // 1. Check message size first (before any processing)
                    const sizeCheck = checkMessageSize(data)
                    if (!sizeCheck.isValid) {
                        logger.warn(
                            `⚠️ [WebSocket]: Message too large from user ${user.id}: ${sizeCheck.size} bytes (max: ${sizeCheck.maxSize})`
                        )
                        socket.send(
                            JSON.stringify({
                                type: 'message-size-error',
                                message: `Message size (${Math.round(sizeCheck.size / 1024)} KB) exceeds maximum allowed size (${Math.round(
                                    sizeCheck.maxSize / 1024
                                )} KB)`,
                                maxSize: sizeCheck.maxSize
                            })
                        )
                        return
                    }

                    // 2. Check rate limit before processing message
                    const rateLimitCheck = await this.poolManager.checkRateLimit(socket)
                    if (!rateLimitCheck.allowed) {
                        socket.send(
                            JSON.stringify({
                                type: 'rate-limit-exceeded',
                                message: `Rate limit exceeded. Please slow down.`,
                                retryAfter: rateLimitCheck.retryAfter
                            })
                        )
                        return
                    }

                    // 3. Parse and route the message
                    try {
                        // Check if message is a valid JSON
                        const event = JSON.parse(data.toString())
                        this.router.handleEvent(socket, event)
                    } catch (error) {
                        logger.error('❌ [WebSocket]: Error parsing message:', error)
                        socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
                    }
                } catch (error) {
                    logger.error('❌ [WebSocket]: Error processing message:', error)
                    socket.send(JSON.stringify({ type: 'error', message: 'Internal server error' }))
                }
            })

            socket.on('close', () => {
                logger.info('🔌 [WebSocket]: Client disconnected')
                // Remove from pool manager
                this.poolManager.removeConnection(socket)
                // Clean up presence for this socket
                this.router.handleDisconnect(socket)
            })

            socket.on('error', (error) => {
                logger.error('❌ [WebSocket]: Connection error:', error)
                // Also clean up on error
                this.router.handleDisconnect(socket)
            })
        })
    }

    getPoolManager() {
        return this.poolManager
    }

    getPoolStats() {
        return this.poolManager.getPoolStats()
    }

    async shutdown() {
        logger.info('🛑 [WSServer]: Shutting down WebSocket server...')
        await this.poolManager.shutdown()
        this.wss.close()
    }

    getServer() {
        return this.wss
    }
}
