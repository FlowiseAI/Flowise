import WebSocket from 'ws'
import { WSRoomManager } from '../../websocket/wsRoomManager'
import { ChatflowAuthService } from './chat-flow-auth.service'
import { AuthenticatedWebSocket, getAuthenticatedUser } from '../../websocket/types'
import logger from '../../../utils/logger'
import {
    IJoinChatFlowEvent,
    ILeaveChatFlowEvent,
    INodePresenceUpdatedEvent,
    IUserColorUpdatedEvent,
    IUserHeartbeatEvent
} from '../../Interface.Event'
import { sanitizeColor, sanitizeUserName } from '../../utils/validation'

type PresenceUser = {
    id: string
    name: string
    sessionId: string
    color: string
    status: 'active' | 'idle' | 'away'
    lastActivityTime: number
}

export class PresenceService {
    private roomManager: WSRoomManager
    private chatflowAuthService: ChatflowAuthService

    // Key: ChatflowId, Values: A list of users present in that chatflow
    private rooms = new Map<string, PresenceUser[]>()

    // Track socket to session mapping for cleanup on disconnect
    // Key: WebSocket instance, Value: { sessionId, chatflowId }
    private socketSessions = new Map<WebSocket, { sessionId: string; chatflowId: string }>()

    // Idle detection constants
    private readonly IDLE_TIMEOUT = 60000 // 60 seconds - mark as idle
    private readonly AWAY_TIMEOUT = 300000 // 5 minutes - mark as away
    private readonly IDLE_CHECK_INTERVAL = 60000 // Check every 60 seconds
    private idleCheckIntervalId: NodeJS.Timeout | null = null

    constructor(roomManager: WSRoomManager, chatflowAuthService: ChatflowAuthService) {
        this.roomManager = roomManager
        this.chatflowAuthService = chatflowAuthService
        this.startIdleCheckInterval()
    }

    async handleJoin(socket: AuthenticatedWebSocket, event: IJoinChatFlowEvent) {
        try {
            // Get authenticated user from socket
            const user = getAuthenticatedUser(socket)

            // Validate chatflowId is provided
            if (!event.chatflowId) {
                logger.warn(`⚠️ [PresenceService]: JOIN_CHAT_FLOW missing chatflowId`)
                socket.send(
                    JSON.stringify({
                        type: 'authz-error',
                        message: 'chatflowId is required'
                    })
                )
                return
            }

            // Verify user has access to this chatflow
            const hasAccess = await this.chatflowAuthService.verifyChatflowAccess(user, event.chatflowId)

            if (!hasAccess) {
                logger.warn(`🚫 [PresenceService]: User ${user.email} denied access to chatflow ${event.chatflowId}`)
                socket.send(
                    JSON.stringify({
                        type: 'authz-error',
                        message: `Access denied to chatflow ${event.chatflowId}. You do not have permission to access this resource.`
                    })
                )
                // Close the connection for this chatflow
                return
            }
            // Proceed with join
            this.roomManager.joinRoom(event.chatflowId, socket)
            if (!this.rooms.has(event.chatflowId)) {
                this.rooms.set(event.chatflowId, [])
            }
            const usersInRoom = this.rooms.get(event.chatflowId)!
            // This allows multiple sessions per user
            const existingUser = usersInRoom.find((user) => user.sessionId === event.sessionId)
            if (!existingUser) {
                // Sanitize user input before storing
                const sanitizedName = sanitizeUserName(user.name)
                const sanitizedColor = sanitizeColor(event.color, '#000000')

                usersInRoom.push({
                    id: user.id,
                    name: sanitizedName,
                    sessionId: event.sessionId,
                    color: sanitizedColor,
                    status: 'active',
                    lastActivityTime: event.timestamp || Date.now()
                })

                logger.info(
                    `✅ [PresenceService]: User joined - Name: ${sanitizedName}, SessionId: ${event.sessionId}, ChatflowId: ${event.chatflowId}`
                )
            } else {
                // User rejoined - reset status to active and update sanitized values
                existingUser.name = sanitizeUserName(user.name)
                existingUser.color = sanitizeColor(event.color, existingUser.color)
                existingUser.status = 'active'
                existingUser.lastActivityTime = event.timestamp || Date.now()
            }

            // Track this socket's session for automatic cleanup on disconnect
            this.socketSessions.set(socket, {
                sessionId: event.sessionId,
                chatflowId: event.chatflowId
            })

            await this.broadcastPresenceUpdate(event.chatflowId)
        } catch (error) {
            logger.error('❌ [PresenceService]: Error in handleJoin:', error)
            socket.send(
                JSON.stringify({
                    type: 'authz-error',
                    message: 'Failed to join chatflow'
                })
            )
        }
    }

    /**
     * Handle user leaving a chatflow
     * @param socket {WebSocket}
     * @param event { type: string; chatflowId: string; sessionId: string }
     */
    async handleLeave(socket: WebSocket, event: ILeaveChatFlowEvent) {
        this.roomManager.leaveRoom(event.chatflowId, socket)
        const usersInRoom = this.rooms.get(event.chatflowId)
        if (usersInRoom) {
            this.rooms.set(
                event.chatflowId,
                usersInRoom.filter((user) => user.sessionId !== event.sessionId)
            )
        }

        // Clean up socket tracking
        this.socketSessions.delete(socket)

        await this.broadcastPresenceUpdate(event.chatflowId)
    }

    /**
     * Handle socket disconnect - automatically clean up user presence
     * This is called when a WebSocket connection closes (tab closed, network error, etc.)
     */
    async handleDisconnect(socket: AuthenticatedWebSocket) {
        const session = this.socketSessions.get(socket)
        if (session) {
            const { sessionId, chatflowId } = session

            // Remove user from room
            this.roomManager.leaveRoom(chatflowId, socket)
            const usersInRoom = this.rooms.get(chatflowId)
            if (usersInRoom) {
                this.rooms.set(
                    chatflowId,
                    usersInRoom.filter((user) => user.sessionId !== sessionId)
                )
            }

            // Clean up tracking
            this.socketSessions.delete(socket)

            logger.info(`🔌 User disconnected: sessionId=${sessionId}, chatflowId=${chatflowId}`)
            await this.broadcastPresenceUpdate(chatflowId)
        }
    }

    async broadcastEvent(chatflowId: string, message: { type: string; payload: any }, exclude?: AuthenticatedWebSocket) {
        await this.roomManager.broadcast(chatflowId, message, exclude)
    }

    async updateUserColor(socket: WebSocket, event: IUserColorUpdatedEvent) {
        const usersInRoom = this.rooms.get(event.chatflowId)
        if (usersInRoom) {
            const user = usersInRoom.find((u) => u.sessionId === event.sessionId)
            if (user) {
                // Sanitize color input before updating
                const sanitizedColor = sanitizeColor(event.color, user.color)
                user.color = sanitizedColor
                user.status = 'active'
                user.lastActivityTime = Date.now()
                await this.broadcastPresenceUpdate(event.chatflowId, socket)
            }
        }
    }

    /**
     * Handle heartbeat message to keep user active
     */
    async handleUserHeartbeat(socket: WebSocket, event: IUserHeartbeatEvent) {
        const { chatflowId, sessionId, status } = event
        if (!chatflowId || !sessionId) return

        // Update user activity
        const usersInRoom = this.rooms.get(chatflowId)
        if (usersInRoom) {
            const user = usersInRoom.find((u) => u.sessionId === sessionId)
            if (user) {
                user.lastActivityTime = Date.now()
                // Do not update status and broadcast if it's not changed
                if (user.status === status) return
                user.status = status || 'active'
                await this.broadcastPresenceUpdate(chatflowId)
            }
        }
    }

    /**
     * Handle node presence update (enter/leave/edit)
     */
    async handleNodePresenceUpdated(socket: WebSocket, event: INodePresenceUpdatedEvent) {
        const usersInRoom = this.rooms.get(event.chatflowId)
        if (usersInRoom) {
            const user = usersInRoom.find((u) => u.sessionId === event.sessionId)
            if (user) {
                const nodePresenceEvent = {
                    type: 'ON_NODE_PRESENCE_UPDATED',
                    payload: {
                        chatflowId: event.chatflowId,
                        userId: user.id,
                        sessionId: user.sessionId,
                        action: event.action,
                        nodeId: event.nodeId
                    }
                }
                await this.roomManager.broadcast(event.chatflowId, nodePresenceEvent, socket)
            }
        }
    }

    /**
     * Periodic job to check for idle/away users based on last activity time
     */
    private startIdleCheckInterval() {
        this.idleCheckIntervalId = setInterval(() => {
            const now = Date.now()
            let hasChanges = false

            this.rooms.forEach((users, chatflowId) => {
                users.forEach((user) => {
                    const timeSinceActivity = now - user.lastActivityTime
                    let newStatus: 'active' | 'idle' | 'away' = user.status

                    if (timeSinceActivity > this.AWAY_TIMEOUT) {
                        newStatus = 'away'
                    } else if (timeSinceActivity > this.IDLE_TIMEOUT) {
                        newStatus = 'idle'
                    }

                    if (newStatus !== user.status) {
                        user.status = newStatus
                        hasChanges = true
                    }
                })

                if (hasChanges) {
                    // No need to await here, fire and forget
                    this.broadcastPresenceUpdate(chatflowId)
                }
            })
        }, this.IDLE_CHECK_INTERVAL)
    }

    /**
     * Cleanup and shutdown the service
     */
    shutdown(): void {
        if (this.idleCheckIntervalId) {
            clearInterval(this.idleCheckIntervalId)
            this.idleCheckIntervalId = null
        }

        // Clear all rooms and tracking
        this.rooms.clear()
        this.socketSessions.clear()

        logger.info('✅ [PresenceService]: Shutdown complete')
    }

    private async broadcastPresenceUpdate(chatflowId: string, exclude?: AuthenticatedWebSocket | undefined) {
        const presenceEvent = {
            type: 'ON_PRESENCE_UPDATED',
            payload: {
                users: this.rooms.get(chatflowId) || [],
                chatflowId: chatflowId
            }
        }

        await this.roomManager.broadcast(chatflowId, presenceEvent, exclude)
    }
}
