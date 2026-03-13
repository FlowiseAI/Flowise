import { DataSource } from 'typeorm'

import { WSRoomManager } from '../../websocket/wsRoomManager'
import { ChatFlowEventService } from './chat-flow-event.service'
import { ChatFlow } from '../../../database/entities/ChatFlow'
import chatflowsService from '../../../services/chatflows'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { UsageCacheManager } from '../../../UsageCacheManager'
import { LoggedInUser } from '../../Interface.Enterprise'
import { AuthenticatedWebSocket } from '../../websocket/types'
import {
    ICursorMovedEvent,
    IEdgeUpdatedEvent,
    IJoinChatFlowEvent,
    ILeaveChatFlowEvent,
    INodeUpdatedEvent,
    IRequestSnapshotSyncEvent
} from '../../Interface.Event'

type ChatFlowSnapshot = {
    id: string
    workspaceId: string
    nodes: Record<string, any>[]
    edges: Record<string, any>[]
    viewport: { x: number; y: number; zoom: number }
    updatedAt: Date
    updatedByUser?: LoggedInUser | null
    // Track last update timestamp for each node/edge (for conflict resolution)
    nodeTimestamps: Map<string, number> // nodeId -> timestamp
    edgeTimestamps: Map<string, number> // edgeId -> timestamp
}

class ChatFlowStateService {
    private dataSource: DataSource
    private usageCacheManager: UsageCacheManager

    // In-memory cache: chatflowId -> latest snapshot
    private snapshots: Map<string, ChatFlowSnapshot> = new Map()

    // Track which chatflows need to be saved
    private dirtyChatflows: Set<string> = new Set()

    // Track which chatflows are currently being saved to prevent race conditions
    private savingChatflows: Set<string> = new Set()

    // Interval ID for periodic save
    private saveIntervalId: NodeJS.Timeout | null = null

    constructor() {
        const appServer = getRunningExpressApp()
        this.dataSource = appServer.AppDataSource
        this.usageCacheManager = appServer.usageCacheManager
        this.startPeriodicSave()
    }

    removeSnapshot(chatflowId: string) {
        this.snapshots.delete(chatflowId)
    }

    /**
     * Get latest state (from memory if exists, otherwise from DB)
     */
    async getLatestSnapshot(chatflowId: string): Promise<ChatFlowSnapshot> {
        if (this.snapshots.has(chatflowId)) {
            return this.snapshots.get(chatflowId)!
        }

        // Load from DB on first access
        const chatFlowRepo = this.dataSource.getRepository(ChatFlow)
        const chatFlow = await chatFlowRepo.findOne({
            where: { id: chatflowId }
        })

        if (!chatFlow) {
            throw new Error('ChatFlow not found')
        }
        const flowData = JSON.parse(chatFlow.flowData)

        const now = Date.now()
        const nodeTimestamps = new Map<string, number>()
        const edgeTimestamps = new Map<string, number>()

        // Initialize timestamps for existing nodes and edges
        for (const node of flowData.nodes || []) {
            nodeTimestamps.set(node.id, now)
        }
        for (const edge of flowData.edges || []) {
            edgeTimestamps.set(edge.id, now)
        }

        const snapshot: ChatFlowSnapshot = {
            id: chatFlow.id,
            workspaceId: chatFlow.workspaceId,
            nodes: flowData.nodes || [],
            edges: flowData.edges || [],
            viewport: flowData.viewport || { x: 0, y: 0, zoom: 1 },
            updatedAt: new Date(),
            nodeTimestamps,
            edgeTimestamps
        }

        this.snapshots.set(chatflowId, snapshot)
        return snapshot
    }

    /**
     * Apply an event to the in-memory snapshot
     */
    async applyEvent(event: INodeUpdatedEvent | IEdgeUpdatedEvent, user?: LoggedInUser | null): Promise<void> {
        const chatflowId = event.chatflowId

        // Ensure we have a snapshot in memory
        const snapshot = await this.getLatestSnapshot(chatflowId)

        const newSnapshot = this.applyEventToSnapshot(snapshot, event, user)

        // Update in-memory state
        this.snapshots.set(chatflowId, newSnapshot)

        // Mark as dirty (needs to be saved to RDS)
        this.dirtyChatflows.add(chatflowId)
    }

    /**
     * Pure function: transforms snapshot based on event
     * Uses last-write-wins strategy based on timestamps
     */
    private applyEventToSnapshot(
        snapshot: ChatFlowSnapshot,
        event: INodeUpdatedEvent | IEdgeUpdatedEvent,
        user?: LoggedInUser | null
    ): ChatFlowSnapshot {
        const next: ChatFlowSnapshot = {
            ...snapshot,
            nodes: [...snapshot.nodes],
            edges: [...snapshot.edges],
            updatedAt: new Date(),
            updatedByUser: user || null,
            nodeTimestamps: new Map(snapshot.nodeTimestamps),
            edgeTimestamps: new Map(snapshot.edgeTimestamps)
        }

        const eventTimestamp = event.timestamp || Date.now()

        switch (event.type) {
            case 'NODE_UPDATED': {
                const currentNode = event.node
                const nodeId = currentNode.id
                const existingTimestamp = next.nodeTimestamps.get(nodeId) || 0

                // Last write wins: only apply if this event is newer
                if (eventTimestamp < existingTimestamp) {
                    return snapshot // Return unchanged snapshot
                }

                switch (event.changeType) {
                    case 'add':
                        for (let node of next.nodes) {
                            node.selected = false
                        }
                        next.nodes.push({
                            ...currentNode,
                            selected: true
                        })
                        next.nodeTimestamps.set(nodeId, eventTimestamp)
                        break
                    case 'remove':
                        next.nodes = next.nodes.filter((node) => node.id !== nodeId)
                        next.nodeTimestamps.delete(nodeId)
                        break
                    case 'position':
                    case 'dimensions':
                    case 'select':
                    default:
                        // 'update' or other types
                        next.nodes = next.nodes.map((node) => {
                            if (node.id === nodeId) {
                                return {
                                    ...currentNode,
                                    selected: true
                                }
                            }
                            return {
                                ...node,
                                selected: false
                            }
                        })
                        next.nodeTimestamps.set(nodeId, eventTimestamp)
                        break
                }
                break
            }

            case 'EDGE_UPDATED': {
                const currentEdge = event.edge
                const edgeId = currentEdge.id
                const existingTimestamp = next.edgeTimestamps.get(edgeId) || 0

                // Last write wins: only apply if this event is newer
                if (eventTimestamp < existingTimestamp) {
                    return snapshot // Return unchanged snapshot
                }

                switch (event.changeType) {
                    case 'add':
                        next.edges.push(currentEdge)
                        next.edgeTimestamps.set(edgeId, eventTimestamp)
                        break
                    case 'remove':
                        next.edges = next.edges.filter((edge) => edge.id !== edgeId)
                        next.edgeTimestamps.delete(edgeId)
                        break
                    case 'buttonedge':
                    default:
                        // 'update' or other types
                        next.edgeTimestamps.set(edgeId, eventTimestamp)
                        break
                }
                break
            }

            default:
                break
        }

        return next
    }

    /**
     * Background job to periodically persist dirty diagrams
     */
    private startPeriodicSave() {
        const SAVE_INTERVAL_MS = 5_000 // every 5 seconds

        this.saveIntervalId = setInterval(async () => {
            if (this.dirtyChatflows.size === 0) return

            // Get chatflows that are dirty and not currently being saved
            const chatFlowsToSave = Array.from(this.dirtyChatflows).filter((id) => !this.savingChatflows.has(id))

            if (chatFlowsToSave.length === 0) return

            // Mark as being saved and remove from dirty set
            for (const chatflowId of chatFlowsToSave) {
                this.savingChatflows.add(chatflowId)
                this.dirtyChatflows.delete(chatflowId)
            }

            for (const chatflowId of chatFlowsToSave) {
                try {
                    const snapshot = this.snapshots.get(chatflowId)
                    if (!snapshot) {
                        this.savingChatflows.delete(chatflowId)
                        continue
                    }

                    const chatflow = await chatflowsService.getChatflowById(chatflowId, snapshot.workspaceId)
                    if (!chatflow) {
                        this.savingChatflows.delete(chatflowId)
                        continue
                    }

                    const user = snapshot.updatedByUser
                    if (!user) {
                        this.savingChatflows.delete(chatflowId)
                        continue
                    }
                    const workspaceId = snapshot.workspaceId
                    const orgId = user.activeOrganizationId
                    const subscriptionId = user.activeOrganizationSubscriptionId

                    const updatedFlowData = {
                        nodes: snapshot.nodes,
                        edges: snapshot.edges,
                        viewport: snapshot.viewport
                    }
                    const bodyChatFlow = {
                        ...chatflow,
                        flowData: JSON.stringify(updatedFlowData)
                    }
                    const updateChatflow = new ChatFlow()
                    Object.assign(updateChatflow, bodyChatFlow)
                    await chatflowsService.updateChatflow(chatflow, updateChatflow, workspaceId, orgId, subscriptionId)
                    // Successfully saved, remove from saving set
                    this.savingChatflows.delete(chatflowId)
                } catch (err) {
                    // If save fails, mark dirty again and remove from saving set
                    this.dirtyChatflows.add(chatflowId)
                    this.savingChatflows.delete(chatflowId)
                }
            }
        }, SAVE_INTERVAL_MS)
    }

    /**
     * Cleanup and shutdown the service
     */
    shutdown(): void {
        if (this.saveIntervalId) {
            clearInterval(this.saveIntervalId)
            this.saveIntervalId = null
        }
    }
}

export class ChatFlowCollaborationService {
    private roomManager: WSRoomManager
    private chatFlowEventService: ChatFlowEventService
    private stateService: ChatFlowStateService

    constructor(roomManager: WSRoomManager) {
        this.roomManager = roomManager
        this.chatFlowEventService = new ChatFlowEventService()
        this.stateService = new ChatFlowStateService()
    }

    /**
     * Get the latest snapshot for a chatflow
     * @param chatflowId {string}
     * @returns {Promise<ChatFlowSnapshot>}
     */
    async getSnapshot(chatflowId: string): Promise<ChatFlowSnapshot> {
        return this.stateService.getLatestSnapshot(chatflowId)
    }

    /**
     * Send snapshot to a specific user (who just joined the chatflow)
     */
    async sendSnapshotToUser(socket: AuthenticatedWebSocket, event: IJoinChatFlowEvent) {
        if (!event.chatflowId) return
        const chatflowId = event.chatflowId
        const snapshot = await this.getSnapshot(chatflowId)
        const snapshotEvent = {
            type: 'ON_SNAPSHOT_SYNC',
            payload: {
                chatflowId: chatflowId,
                snapshot: {
                    nodes: snapshot.nodes,
                    edges: snapshot.edges,
                    viewport: snapshot.viewport
                }
            }
        }
        // Send only to the specified socket
        socket.send(JSON.stringify(snapshotEvent))
    }

    /**
     * Broadcast snapshot to all users in the chatflow except the sender
     * This is useful after applying multiple changes or on-demand sync (idle user)
     */
    async broadcastSnapshotToUsers(socket: AuthenticatedWebSocket, event: IRequestSnapshotSyncEvent) {
        if (!event.chatflowId) return
        const chatflowId = event.chatflowId
        const snapshot = await this.getSnapshot(chatflowId)
        const snapshotEvent = {
            type: 'ON_SNAPSHOT_SYNC',
            payload: {
                chatflowId: chatflowId,
                snapshot: {
                    nodes: snapshot.nodes,
                    edges: snapshot.edges,
                    viewport: snapshot.viewport
                }
            }
        }
        this.roomManager.broadcast(chatflowId, snapshotEvent, socket)
    }

    /**
     * Remove snapshot from memory if no users are present
     */
    removeSnapshot(event: ILeaveChatFlowEvent) {
        if (this.roomManager.isRoomEmpty(event.chatflowId)) {
            this.stateService.removeSnapshot(event.chatflowId)
        }
    }

    /**
     * Handle chat flow collaboration event (node/edge updates)
     */
    async handleRemoteChange(socket: AuthenticatedWebSocket, event: IEdgeUpdatedEvent | INodeUpdatedEvent) {
        await this.chatFlowEventService.saveEvent(event)
        await this.stateService.applyEvent(event, socket.user)

        const remoteChangeEvent = {
            type: 'ON_REMOTE_CHANGE',
            payload: {
                chatflowId: event.chatflowId,
                changeType: event.changeType,
                node: event.node,
                edge: event.edge
            }
        }
        this.roomManager.broadcast(event.chatflowId, remoteChangeEvent, socket)
    }

    /**
     * Handle cursor movement event
     */
    async handleCursorMove(socket: AuthenticatedWebSocket, event: ICursorMovedEvent) {
        // Broadcast cursor movement to others in the same chat flow
        const cursorMoveEvent = {
            type: 'ON_CURSOR_MOVED',
            payload: {
                chatflowId: event.chatflowId,
                x: event.x,
                y: event.y,
                name: event.name,
                color: event.color,
                sessionId: event.sessionId,
                timestamp: Date.now()
            }
        }
        this.roomManager.broadcast(event.chatflowId, cursorMoveEvent, socket)
    }
}
