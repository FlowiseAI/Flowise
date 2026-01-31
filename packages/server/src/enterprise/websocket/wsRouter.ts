import { ChatFlowCollaborationService } from '../services/collaboration/chat-flow-collaboration.service'
import { PresenceService } from '../services/collaboration/presence.service'
import { AuthenticatedWebSocket } from './types'
import { ChatflowAuthService } from '../services/collaboration/chat-flow-auth.service'
import { WSRoomManager } from './wsRoomManager'
import logger from '../../utils/logger'
import { IEvent } from '../Interface.Event'
import { isValidChatflowId, isValidSessionId, isValidNodeId, sanitizeColor, sanitizeTimestamp } from '../utils/validation'

export class WSRouter {
    private roomManager: WSRoomManager
    private presenceService: PresenceService
    private chatFlowService: ChatFlowCollaborationService
    private chatflowAuthService: ChatflowAuthService

    constructor() {
        this.roomManager = new WSRoomManager()
        this.chatflowAuthService = new ChatflowAuthService()
        this.presenceService = new PresenceService(this.roomManager, this.chatflowAuthService)
        this.chatFlowService = new ChatFlowCollaborationService(this.roomManager)
    }

    handleEvent(socket: AuthenticatedWebSocket, event: IEvent) {
        // Verify socket is authenticated
        if (!socket.user) {
            logger.warn('⚠️ [WSRouter]: Received event from unauthenticated socket')
            socket.send(
                JSON.stringify({
                    type: 'auth-error',
                    message: 'Authentication required'
                })
            )
            return
        }

        // Validate common event fields before routing
        if ('chatflowId' in event && !isValidChatflowId(event.chatflowId)) {
            logger.warn(`⚠️ [WSRouter]: Invalid chatflowId in event: ${event.type}`)
            socket.send(
                JSON.stringify({
                    type: 'validation-error',
                    message: 'Invalid chatflow ID format'
                })
            )
            return
        }

        if ('sessionId' in event && !isValidSessionId(event.sessionId)) {
            logger.warn(`⚠️ [WSRouter]: Invalid sessionId in event: ${event.type}`)
            socket.send(
                JSON.stringify({
                    type: 'validation-error',
                    message: 'Invalid session ID format'
                })
            )
            return
        }

        // Sanitize color fields if present
        if ('color' in event && event.color) {
            event.color = sanitizeColor(event.color)
        }

        // Sanitize timestamp fields if present
        if ('timestamp' in event) {
            event.timestamp = sanitizeTimestamp(event.timestamp)
        }

        // Validate nodeId if present
        if ('nodeId' in event && !isValidNodeId(event.nodeId)) {
            logger.warn(`⚠️ [WSRouter]: Invalid nodeId in event: ${event.type}`)
            socket.send(
                JSON.stringify({
                    type: 'validation-error',
                    message: 'Invalid node ID format'
                })
            )
            return
        }

        switch (event.type) {
            // Presence events
            case 'JOIN_CHAT_FLOW':
                this.presenceService.handleJoin(socket, event)
                this.chatFlowService.sendSnapshotToUser(socket, event)
                break
            case 'LEAVE_CHAT_FLOW':
                this.presenceService.handleLeave(socket, event)
                this.chatFlowService.removeSnapshot(event)
                break
            // User preference events
            case 'USER_COLOR_UPDATED':
                this.presenceService.updateUserColor(socket, event)
                break
            case 'USER_HEARTBEAT':
                this.presenceService.handleUserHeartbeat(socket, event)
                break
            // Snapshot sync events
            case 'REQUEST_SNAPSHOT_SYNC':
                this.chatFlowService.broadcastSnapshotToUsers(socket, event)
                break

            // Chat flow collaboration events
            case 'NODE_UPDATED':
            case 'EDGE_UPDATED':
                this.chatFlowService.handleRemoteChange(socket, event)
                break
            // Cursor movement event
            case 'CURSOR_MOVED':
                this.chatFlowService.handleCursorMove(socket, event)
                break

            // Node-level presence events
            case 'NODE_PRESENCE_UPDATED':
                this.presenceService.handleNodePresenceUpdated(socket, event)
                break
            default:
                logger.warn(`⚠️ [WSRouter]: Unknown event`)
        }
    }

    /**
     * Handle socket disconnect - clean up all presence for this socket
     */
    handleDisconnect(socket: AuthenticatedWebSocket) {
        this.presenceService.handleDisconnect(socket)
    }
}
