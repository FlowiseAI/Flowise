import WebSocket from 'ws'
import { AuthenticatedWebSocket } from './types'
import logger from '../../utils/logger'
import { MODE } from '../../Interface'
import Redis from 'ioredis'

interface ConnectionMetrics {
    userId: string
    connectedAt: number
    messageCount: number
    lastMessageAt: number
}

interface RateLimitState {
    tokens: number
    lastRefill: number
}

interface WSPoolConfig {
    maxConnections?: number
    maxConnectionsPerUser?: number
    messageRateLimit?: number // messages per second per connection
    messageRateWindow?: number // window in seconds
}

export class WSPoolManager {
    private static instance: WSPoolManager
    private connections = new Map<WebSocket, ConnectionMetrics>()
    private userConnections = new Map<string, Set<AuthenticatedWebSocket>>()
    private rateLimitStates = new Map<WebSocket, RateLimitState>()
    private redisClient: Redis | null = null
    private config: Required<WSPoolConfig>
    private cleanupIntervalId: NodeJS.Timeout | null = null

    // Default configuration
    private readonly DEFAULT_CONFIG: Required<WSPoolConfig> = {
        maxConnections: 1000, // Total concurrent connections
        maxConnectionsPerUser: 10, // Max connections per user
        messageRateLimit: 100, // 100 messages per window
        messageRateWindow: 1 // 1 second
    }

    private constructor() {
        // Load configuration from environment or use defaults
        this.config = {
            maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || this.DEFAULT_CONFIG.maxConnections.toString()),
            maxConnectionsPerUser: parseInt(
                process.env.WS_MAX_CONNECTIONS_PER_USER || this.DEFAULT_CONFIG.maxConnectionsPerUser.toString()
            ),
            messageRateLimit: parseInt(process.env.WS_MESSAGE_RATE_LIMIT || this.DEFAULT_CONFIG.messageRateLimit.toString()),
            messageRateWindow: parseInt(process.env.WS_MESSAGE_RATE_WINDOW || this.DEFAULT_CONFIG.messageRateWindow.toString())
        }

        // Initialize Redis client if in queue mode or REDIS_URL is set
        if (process.env.MODE === MODE.QUEUE || process.env.REDIS_URL) {
            this.initializeRedis()
        }

        // Start periodic cleanup
        this.startCleanupInterval()
    }

    private initializeRedis() {
        try {
            if (process.env.REDIS_URL) {
                this.redisClient = new Redis(process.env.REDIS_URL, {
                    keepAlive:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                })
            } else {
                this.redisClient = new Redis({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    username: process.env.REDIS_USERNAME || undefined,
                    password: process.env.REDIS_PASSWORD || undefined,
                    tls:
                        process.env.REDIS_TLS === 'true'
                            ? {
                                  cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
                                  key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
                                  ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined
                              }
                            : undefined,
                    keepAlive:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                })
            }

            this.redisClient.on('error', (err) => {
                logger.error('❌ [WSPoolManager]: Redis connection error:', err)
            })

            this.redisClient.on('connect', () => {
                logger.info('✅ [WSPoolManager]: Redis connected for distributed rate limiting')
            })
        } catch (error) {
            logger.error('❌ [WSPoolManager]: Failed to initialize Redis:', error)
            this.redisClient = null
        }
    }

    public static getInstance(): WSPoolManager {
        if (!WSPoolManager.instance) {
            WSPoolManager.instance = new WSPoolManager()
        }
        return WSPoolManager.instance
    }

    /**
     * Check if new connection can be accepted
     */
    public canAcceptConnection(userId: string): { allowed: boolean; reason?: string } {
        // Check global connection limit
        if (this.connections.size >= this.config.maxConnections) {
            logger.warn(`⚠️ [WSPoolManager]: Max global connections reached (${this.config.maxConnections})`)
            return { allowed: false, reason: 'Server at maximum capacity. Please try again later.' }
        }

        // Check per-user connection limit
        const userConnections = this.userConnections.get(userId)
        if (userConnections && userConnections.size >= this.config.maxConnectionsPerUser) {
            logger.warn(`⚠️ [WSPoolManager]: Max connections per user reached for ${userId} (${this.config.maxConnectionsPerUser})`)
            return {
                allowed: false,
                reason: `Maximum ${this.config.maxConnectionsPerUser} connections per user exceeded.`
            }
        }

        return { allowed: true }
    }

    /**
     * Register a new WebSocket connection
     */
    public async addConnection(socket: AuthenticatedWebSocket): Promise<void> {
        const userId = socket.user?.id || 'anonymous'
        const sessionId = socket.sessionId || 'unknown'

        // Get or create user connections set
        if (!this.userConnections.has(userId)) {
            this.userConnections.set(userId, new Set())
        }
        const userSockets = this.userConnections.get(userId)!

        // Add the socket first to make the operation atomic
        userSockets.add(socket)

        // Check for duplicate sessionId after adding (race condition safe)
        let hasDuplicate = false
        for (const s of userSockets) {
            if (s !== socket && s.sessionId === sessionId) {
                // Found another socket with same sessionId, remove current one
                userSockets.delete(socket)
                hasDuplicate = true
                logger.warn(`⚠️ [WSPoolManager]: Duplicate session ${sessionId} detected for user ${userId}. Rejecting new connection.`)
                break
            }
        }

        if (hasDuplicate) {
            // Clean up empty user connection set if needed
            if (userSockets.size === 0) {
                this.userConnections.delete(userId)
            }
            return
        }

        // Initialize rate limit state for this connection (token bucket algorithm)
        this.rateLimitStates.set(socket, {
            tokens: this.config.messageRateLimit,
            lastRefill: Date.now()
        })

        // Add connection metrics
        const metrics: ConnectionMetrics = {
            userId,
            connectedAt: Date.now(),
            messageCount: 0,
            lastMessageAt: Date.now()
        }

        this.connections.set(socket, metrics)

        logger.info(
            `📊 [WSPoolManager]: Connection added. Total: ${this.connections.size}, User ${userId}: ${
                this.userConnections.get(userId)?.size
            }`
        )
    }

    /**
     * Check if message should be rate limited
     * Uses Redis for Queue mode (distributed), in-memory token bucket for non-Queue mode
     * Returns true if message is allowed, false if rate limited
     */
    public async checkRateLimit(socket: WebSocket): Promise<{ allowed: boolean; retryAfter?: number }> {
        const metrics = this.connections.get(socket)

        if (!metrics) {
            return { allowed: true }
        }

        // Use Redis-based rate limiting in QUEUE mode
        if (this.redisClient && process.env.MODE === MODE.QUEUE) {
            return this.checkRateLimitRedis(socket, metrics)
        }

        // Use in-memory token bucket for non-Queue mode
        return this.checkRateLimitMemory(socket, metrics)
    }

    /**
     * Redis-based rate limiting for distributed systems (Queue mode)
     */
    private async checkRateLimitRedis(socket: WebSocket, metrics: ConnectionMetrics): Promise<{ allowed: boolean; retryAfter?: number }> {
        if (!this.redisClient) {
            return { allowed: true }
        }

        try {
            const key = `ws_rl:${metrics.userId}`
            const now = Date.now()
            const windowStart = now - this.config.messageRateWindow * 1000

            // Use Redis sorted set to track messages in time window
            const multi = this.redisClient.multi()
            // Remove old entries outside the time window
            multi.zremrangebyscore(key, 0, windowStart)
            // Count current entries in window
            multi.zcard(key)
            // Add current message timestamp
            multi.zadd(key, now, `${now}`)
            // Set expiry on the key
            multi.expire(key, this.config.messageRateWindow * 2)

            const results = await multi.exec()
            const messageCount = results?.[1]?.[1] as number

            if (messageCount >= this.config.messageRateLimit) {
                // Rate limit exceeded
                const retryAfter = Math.ceil(this.config.messageRateWindow)
                logger.warn(`⚠️ [WSPoolManager]: Rate limit exceeded for user ${metrics.userId}. Retry after: ${retryAfter}s`)

                return {
                    allowed: false,
                    retryAfter
                }
            }

            // Update metrics
            metrics.messageCount++
            metrics.lastMessageAt = now

            return { allowed: true }
        } catch (error) {
            logger.error('❌ [WSPoolManager]: Redis rate limit check failed:', error)
            // Fallback to allowing message if Redis fails
            return { allowed: true }
        }
    }

    /**
     * In-memory token bucket rate limiting for single instance (non-Queue mode)
     */
    private async checkRateLimitMemory(socket: WebSocket, metrics: ConnectionMetrics): Promise<{ allowed: boolean; retryAfter?: number }> {
        const rateLimitState = this.rateLimitStates.get(socket)

        if (!rateLimitState) {
            return { allowed: true }
        }

        const now = Date.now()
        const timePassed = (now - rateLimitState.lastRefill) / 1000 // Convert to seconds

        // Refill tokens based on time passed
        const tokensToAdd = timePassed * (this.config.messageRateLimit / this.config.messageRateWindow)
        rateLimitState.tokens = Math.min(this.config.messageRateLimit, rateLimitState.tokens + tokensToAdd)
        rateLimitState.lastRefill = now

        // Check if we have tokens available
        if (rateLimitState.tokens >= 1) {
            rateLimitState.tokens -= 1

            // Update metrics
            metrics.messageCount++
            metrics.lastMessageAt = now

            return { allowed: true }
        } else {
            // Rate limit exceeded - calculate retry after
            const tokensNeeded = 1 - rateLimitState.tokens
            const retryAfter = Math.ceil((tokensNeeded * this.config.messageRateWindow) / this.config.messageRateLimit)

            logger.warn(`⚠️ [WSPoolManager]: Rate limit exceeded for user ${metrics.userId}. Retry after: ${retryAfter}s`)

            return {
                allowed: false,
                retryAfter
            }
        }
    }

    /**
     * Remove a WebSocket connection
     */
    public removeConnection(socket: WebSocket): void {
        const metrics = this.connections.get(socket)

        if (!metrics) {
            return
        }

        const userId = metrics.userId

        // Remove from connections map
        this.connections.delete(socket)

        // Remove from user connections
        const userConnections = this.userConnections.get(userId)
        if (userConnections) {
            userConnections.delete(socket)
            if (userConnections.size === 0) {
                this.userConnections.delete(userId)
            }
        }

        // Remove rate limiter
        this.rateLimitStates.delete(socket)

        const connectionDuration = Date.now() - metrics.connectedAt
        logger.info(
            `📊 [WSPoolManager]: Connection removed. User: ${userId}, Duration: ${Math.round(connectionDuration / 1000)}s, Messages: ${
                metrics.messageCount
            }, Total connections: ${this.connections.size}`
        )
    }

    /**
     * Get metrics for a connection
     */
    public getConnectionMetrics(socket: WebSocket): ConnectionMetrics | undefined {
        return this.connections.get(socket)
    }

    /**
     * Get overall pool statistics
     */
    public getPoolStats() {
        const now = Date.now()
        const activeConnections = this.connections.size
        const uniqueUsers = this.userConnections.size

        let totalMessages = 0
        let oldestConnection = now
        let newestConnection = now

        this.connections.forEach((metrics) => {
            totalMessages += metrics.messageCount
            if (metrics.connectedAt < oldestConnection) {
                oldestConnection = metrics.connectedAt
            }
            if (metrics.connectedAt > newestConnection) {
                newestConnection = metrics.connectedAt
            }
        })

        return {
            activeConnections,
            uniqueUsers,
            maxConnections: this.config.maxConnections,
            utilizationPercent: ((activeConnections / this.config.maxConnections) * 100).toFixed(2),
            totalMessages,
            averageMessagesPerConnection: activeConnections > 0 ? (totalMessages / activeConnections).toFixed(2) : 0,
            oldestConnectionAge: activeConnections > 0 ? Math.round((now - oldestConnection) / 1000) : 0,
            config: {
                ...this.config
            }
        }
    }

    /**
     * Get connections for a specific user
     */
    public getUserConnections(userId: string): Set<WebSocket> | undefined {
        return this.userConnections.get(userId)
    }

    /**
     * Broadcast message to all connections of a user
     */
    public broadcastToUser(userId: string, message: any): void {
        const connections = this.userConnections.get(userId)
        if (!connections) {
            return
        }

        const messageStr = JSON.stringify(message)
        let sentCount = 0

        connections.forEach((socket) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(messageStr)
                sentCount++
            }
        })

        logger.debug(`📤 [WSPoolManager]: Broadcasted to ${sentCount}/${connections.size} connections for user ${userId}`)
    }

    /**
     * Periodic cleanup of stale connections
     */
    private startCleanupInterval(): void {
        const CLEANUP_INTERVAL = 60000 // 1 minute
        const STALE_THRESHOLD = 3600000 // 1 hour

        this.cleanupIntervalId = setInterval(() => {
            const now = Date.now()
            let cleanedCount = 0

            this.connections.forEach((metrics, socket) => {
                // Check for stale connections (no messages for STALE_THRESHOLD)
                if (now - metrics.lastMessageAt > STALE_THRESHOLD && socket.readyState !== WebSocket.OPEN) {
                    this.removeConnection(socket)
                    cleanedCount++
                }
            })

            if (cleanedCount > 0) {
                logger.info(`🧹 [WSPoolManager]: Cleaned up ${cleanedCount} stale connections`)
            }

            // Log stats every cleanup cycle
            const stats = this.getPoolStats()
            logger.debug(`📊 [WSPoolManager]: Pool stats - ${JSON.stringify(stats)}`)
        }, CLEANUP_INTERVAL)
    }

    /**
     * Graceful shutdown
     */
    public async shutdown(): Promise<void> {
        logger.info('🛑 [WSPoolManager]: Shutting down...')

        // Clear cleanup interval
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId)
            this.cleanupIntervalId = null
        }

        // Close all connections
        this.connections.forEach((_, socket) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.close(1001, 'Server shutting down')
            }
        })

        // Clear all maps
        this.connections.clear()
        this.userConnections.clear()
        this.rateLimitStates.clear()

        // Close Redis connection if exists
        if (this.redisClient) {
            await this.redisClient.quit()
            logger.info('✅ [WSPoolManager]: Redis connection closed')
        }

        logger.info('✅ [WSPoolManager]: Shutdown complete')
    }
}
