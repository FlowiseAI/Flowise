import Redis from 'ioredis'
import WebSocket from 'ws'
import { AuthenticatedWebSocket } from './types'
import logger from '../../utils/logger'

/**
 * Manages WebSocket rooms with Redis Pub/Sub for cross-instance synchronization
 *
 * This class enables horizontal scaling of WebSocket servers by:
 * - Tracking local connections per room
 * - Publishing messages to Redis for other instances
 * - Subscribing to Redis channels to receive messages from other instances
 * - Broadcasting messages to local connections only
 *
 * Architecture:
 * - Each WebSocket server instance has its own WSRoomManager
 * - All instances publish to same Redis channels
 * - Each instance only broadcasts to its own local connections
 * - Messages are deduplicated by instanceId to avoid echo
 */
export class WSRoomManager {
    private publisher: Redis | null = null
    private subscriber: Redis | null = null
    private localRooms = new Map<string, Set<AuthenticatedWebSocket>>()
    private readonly instanceId: string
    private readonly redisUrl: string | undefined
    private isRedisEnabled: boolean = false

    constructor() {
        this.instanceId = `ws-${process.env.HOSTNAME || Math.random().toString(36).substr(2, 9)}`
        this.redisUrl = process.env.REDIS_URL

        if (this.redisUrl) {
            // Initialize Redis asynchronously (non-blocking)
            this.initializeRedis().catch((error) => {
                logger.error('❌ [WSRoomManager]: Failed to initialize Redis in constructor:', error)
            })
        } else {
            logger.warn('⚠️  [WSRoomManager]: Redis URL not configured. Running in single-instance mode without cross-instance sync.')
        }
    }

    /**
     * Initialize Redis connections for Pub/Sub
     */
    private async initializeRedis() {
        try {
            // Separate Redis connections for pub and sub
            this.publisher = new Redis(this.redisUrl!, {
                lazyConnect: true, // Don't connect immediately
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) {
                        logger.error('❌ [WSRoomManager]: Max Redis retry attempts reached')
                        return null
                    }
                    return Math.min(times * 100, 2000)
                }
            })

            this.subscriber = new Redis(this.redisUrl!, {
                lazyConnect: true, // Don't connect immediately
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) {
                        logger.error('❌ [WSRoomManager]: Max Redis retry attempts reached')
                        return null
                    }
                    return Math.min(times * 100, 2000)
                }
            })

            // Wait for publisher to connect
            await this.publisher.connect()
            await this.publisher.ping()

            // Wait for subscriber to connect
            await this.subscriber.connect()

            // Now setup subscriptions (after connection is ready)
            this.setupSubscriber()

            this.isRedisEnabled = true

            logger.info(`✅ [WSRoomManager]: Redis Pub/Sub initialized (Instance: ${this.instanceId})`)
        } catch (error) {
            logger.error('❌ [WSRoomManager]: Failed to initialize Redis:', error)
            this.isRedisEnabled = false
            // Clean up connections on error
            if (this.publisher) {
                this.publisher.disconnect()
                this.publisher = null
            }
            if (this.subscriber) {
                this.subscriber.disconnect()
                this.subscriber = null
            }
        }
    }

    /**
     * Set up Redis subscriber with pattern matching for all room channels
     */
    private setupSubscriber() {
        if (!this.subscriber) return

        // Subscribe to all room and broadcast events
        this.subscriber.psubscribe('ws:room:*', 'ws:broadcast:*', (err, count) => {
            if (err) {
                logger.error('❌ [WSRoomManager]: Redis subscription error:', err)
            } else {
                logger.debug(`📡 [WSRoomManager]: Subscribed to ${count} Redis channel patterns`)
            }
        })

        // Handle incoming messages from Redis
        this.subscriber.on('pmessage', (pattern, channel, message) => {
            try {
                const data = JSON.parse(message)

                // Don't process our own messages (avoid echo)
                if (data.instanceId === this.instanceId) {
                    return
                }

                logger.debug(`📨 [WSRoomManager]: Received message from instance ${data.instanceId} on channel ${channel}`)
                this.handleRemoteEvent(channel, data)
            } catch (error) {
                logger.error('❌ [WSRoomManager]: Error processing Redis pub/sub message:', error)
            }
        })

        // Handle Redis errors
        this.subscriber.on('error', (error) => {
            logger.error('❌ [WSRoomManager]: Redis subscriber error:', error)
        })

        // Handle Redis reconnection
        this.subscriber.on('ready', () => {
            logger.info('🔄 [WSRoomManager]: Redis subscriber reconnected')
        })
    }

    /**
     * Handle events received from other WebSocket instances via Redis
     */
    private handleRemoteEvent(channel: string, data: any) {
        // Extract room ID from channel name
        const roomMatch = channel.match(/ws:room:(.+)/)
        if (roomMatch) {
            const roomId = roomMatch[1]
            this.broadcastToLocalRoom(roomId, data.message, data.excludeSessionId)
        } else if (channel === 'ws:broadcast:all') {
            // Global broadcast to all local connections
            this.localRooms.forEach((_, roomId) => {
                this.broadcastToLocalRoom(roomId, data.message, data.excludeSessionId)
            })
        }
    }

    /**
     * Join a room (local tracking only)
     * @param roomId - The room identifier (e.g., chatflowId)
     * @param socket - The WebSocket connection to add to the room
     */
    joinRoom(roomId: string, socket: AuthenticatedWebSocket) {
        if (!this.localRooms.has(roomId)) {
            this.localRooms.set(roomId, new Set())
        }
        this.localRooms.get(roomId)!.add(socket)
        logger.debug(
            `[${this.instanceId}] Socket ${socket.sessionId || 'unknown'} joined room: ${roomId} (${this.getRoomSize(roomId)} connections)`
        )
    }

    /**
     * Leave a room (local tracking only)
     * @param roomId - The room identifier
     * @param socket - The WebSocket connection to remove from the room
     */
    leaveRoom(roomId: string, socket: AuthenticatedWebSocket) {
        const room = this.localRooms.get(roomId)
        if (room) {
            room.delete(socket)
            if (room.size === 0) {
                this.localRooms.delete(roomId)
                logger.debug(`[${this.instanceId}] Room ${roomId} is now empty and removed`)
            } else {
                logger.debug(
                    `[${this.instanceId}] Socket ${socket.sessionId || 'unknown'} left room: ${roomId} (${room.size} connections remaining)`
                )
            }
        }
    }

    /**
     * Check if a room is empty
     * @param roomId - The room identifier
     * @returns True if the room has no local connections
     */
    isRoomEmpty(roomId: string): boolean {
        const room = this.localRooms.get(roomId)
        return !room || room.size === 0
    }

    /**
     * Leave all rooms for a given socket
     * @param socket - The WebSocket connection to remove from all rooms
     */
    leaveAllRooms(socket: AuthenticatedWebSocket) {
        this.localRooms.forEach((room, roomId) => {
            if (room.has(socket)) {
                this.leaveRoom(roomId, socket)
            }
        })
    }

    /**
     * Broadcast message to all instances via Redis Pub/Sub
     * Each instance will then broadcast to its local connections
     *
     * @param roomId - The room to broadcast to
     * @param message - The message object to send
     * @param excludeSocket - Optional socket to exclude from broadcast
     */
    async broadcast(roomId: string, message: any, excludeSocket?: AuthenticatedWebSocket) {
        const payload = {
            instanceId: this.instanceId,
            message,
            excludeSessionId: excludeSocket?.sessionId,
            timestamp: Date.now()
        }

        // If Redis is enabled, publish to all instances
        if (this.isRedisEnabled && this.publisher) {
            try {
                await this.publisher.publish(`ws:room:${roomId}`, JSON.stringify(payload))
                logger.debug(`📡 [${this.instanceId}] Published message to Redis channel: ws:room:${roomId}`)
            } catch (error) {
                logger.error('❌ [WSRoomManager]: Failed to publish to Redis:', error)
                // Fall through to local broadcast even if Redis fails
            }
        }

        // Always broadcast to local connections immediately (don't wait for Redis echo)
        this.broadcastToLocalRoom(roomId, message, excludeSocket?.sessionId)
    }

    /**
     * Broadcast to local connections only
     * This is called both for local broadcasts and when receiving messages from Redis
     *
     * @param roomId - The room to broadcast to
     * @param message - The message object to send
     * @param excludeSessionId - Optional session ID to exclude from broadcast
     */
    private broadcastToLocalRoom(roomId: string, message: any, excludeSessionId?: string) {
        const room = this.localRooms.get(roomId)
        if (!room || room.size === 0) {
            return
        }

        const messageStr = JSON.stringify(message)
        let sentCount = 0
        let errorCount = 0

        room.forEach((socket) => {
            // Skip excluded session
            if (excludeSessionId && socket.sessionId === excludeSessionId) {
                return
            }

            // Only send to open connections
            if (socket.readyState === WebSocket.OPEN) {
                try {
                    socket.send(messageStr)
                    sentCount++
                } catch (error) {
                    logger.error('❌ [WSRoomManager]: Error sending to socket:', error)
                    errorCount++
                }
            }
        })

        if (sentCount > 0) {
            logger.debug(
                `[${this.instanceId}] Broadcasted to ${sentCount} local connections in room ${roomId}${
                    errorCount > 0 ? ` (${errorCount} errors)` : ''
                }`
            )
        }
    }

    /**
     * Get the number of local connections in a room
     * @param roomId - The room identifier
     * @returns Number of local connections
     */
    getRoomSize(roomId: string): number {
        return this.localRooms.get(roomId)?.size || 0
    }

    /**
     * Get all local room IDs
     * @returns Array of room identifiers
     */
    getRoomIds(): string[] {
        return Array.from(this.localRooms.keys())
    }

    /**
     * Get total number of local connections across all rooms
     * @returns Total connection count
     */
    getTotalConnections(): number {
        let total = 0
        this.localRooms.forEach((room) => {
            total += room.size
        })
        return total
    }

    /**
     * Get statistics about the room manager
     * @returns Statistics object
     */
    getStats() {
        return {
            instanceId: this.instanceId,
            redisEnabled: this.isRedisEnabled,
            totalRooms: this.localRooms.size,
            totalConnections: this.getTotalConnections(),
            rooms: Array.from(this.localRooms.entries()).map(([roomId, connections]) => ({
                roomId,
                connectionCount: connections.size
            }))
        }
    }

    /**
     * Check if Redis is enabled and connected
     * @returns True if Redis is available
     */
    isRedisAvailable(): boolean {
        return (
            this.isRedisEnabled &&
            this.publisher !== null &&
            this.subscriber !== null &&
            this.publisher.status === 'ready' &&
            this.subscriber.status === 'ready'
        )
    }

    /**
     * Cleanup and close Redis connections
     */
    async shutdown() {
        logger.info(`🛑 [WSRoomManager]: Shutting down instance ${this.instanceId}`)

        try {
            if (this.subscriber) {
                await this.subscriber.punsubscribe()
                await this.subscriber.quit()
            }
            if (this.publisher) {
                await this.publisher.quit()
            }
        } catch (error) {
            logger.error('❌ [WSRoomManager]: Error during shutdown:', error)
        }

        this.localRooms.clear()
        this.isRedisEnabled = false

        logger.info('✅ [WSRoomManager]: Shutdown complete')
    }
}
