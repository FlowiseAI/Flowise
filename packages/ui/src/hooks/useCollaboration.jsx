import { useEffect, useCallback, useState, useRef, useContext } from 'react'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { CanvasPresenceContext } from '@/contexts/CanvasPresenceContext'
import { useIdleDetection } from './useIdleDetection'

/**
 * Hook for managing real-time collaboration on chat flows
 */
export const useCollaboration = () => {
    // Contexts
    const { send, on } = useWebSocketContext()
    const { hasJoined, chatflowId, sessionId, activeUsers, setActiveUsers } = useContext(CanvasPresenceContext)

    const [remoteChanges, setRemoteChanges] = useState(null)
    const [remoteCursors, setRemoteCursors] = useState({})
    // Listen for snapshot sync events (when joining a chatflow)
    const [snapshotSync, setSnapshotSync] = useState(null)

    // Track local changes for activity-based sync
    const localChangeCountRef = useRef(0)
    const SYNC_THRESHOLD = 10 // Sync after 10 local changes
    const PERIODIC_SYNC_INTERVAL = 60000 // Sync every 60 seconds
    const CURSOR_CLEANUP_INTERVAL = 5000 // Clean up stale cursors every 5 seconds
    const CURSOR_TIMEOUT = 10000 // Remove cursors not seen in 10 seconds
    const IDLE_TIMEOUT = 60000 // 1 minute
    const AWAY_TIMEOUT = 300000 // 5 minutes

    // Idle detection
    const { status: userStatus } = useIdleDetection(IDLE_TIMEOUT, AWAY_TIMEOUT)

    // Listen for presence updates
    useEffect(() => {
        /**
         * Handle presence update events
         * @param {object} data The presence update data { type: string, payload: { chatflowId: string, users: array } }
         */
        const handlePresenceUpdate = (data) => {
            if (data.payload.chatflowId === chatflowId) {
                setActiveUsers(data.payload.users || [])
            }
        }

        const unsubscribe = on('ON_PRESENCE_UPDATED', handlePresenceUpdate)
        return () => unsubscribe()
    }, [chatflowId, on, setActiveUsers])

    // Listen for remote changes (nodes or edges updated by other users)
    useEffect(() => {
        /**
         * Handle remote change events
         * @param {object} data The remote change data { type: string, payload: { chatflowId: string, node: object, edge: object, changeType: string } }
         */
        const handleRemoteChange = (data) => {
            if (data.payload.chatflowId === chatflowId) {
                setRemoteChanges({ node: data.payload.node, edge: data.payload.edge, changeType: data.payload.changeType })
            }
        }

        const unsubscribe = on('ON_REMOTE_CHANGE', handleRemoteChange)
        return () => unsubscribe()
    }, [chatflowId, on])

    // Listen for remote cursor movements
    useEffect(() => {
        /**
         * Handle cursor movement events
         * @param {object} data The cursor movement data { type: string, payload: { chatflowId: string, sessionId: string, x: number, y: number, name: string, color: string, timestamp: number } }
         */
        const handleCursorMove = (data) => {
            if (data.payload.chatflowId === chatflowId && data.payload.sessionId !== sessionId) {
                setRemoteCursors((prev) => ({
                    ...prev,
                    [data.payload.sessionId]: {
                        // userId: data.payload.userId,
                        x: data.payload.x,
                        y: data.payload.y,
                        name: data.payload.name,
                        color: data.payload.color,
                        sessionId: data.payload.sessionId,
                        lastSeen: Date.now()
                    }
                }))
            }
        }

        const unsubscribe = on('ON_CURSOR_MOVED', handleCursorMove)
        return () => unsubscribe()
    }, [chatflowId, on, sessionId])

    useEffect(() => {
        /**
         * Handle snapshot sync events
         * @param {object} data The snapshot data { type: string, payload: { chatflowId: string, snapshot: { nodes: array, edges: array, viewport: object } } }
         */
        const handleSnapshotSync = (data) => {
            if (data.payload.chatflowId === chatflowId) {
                setSnapshotSync(data.payload.snapshot)
                // Reset local change count after receiving snapshot
                localChangeCountRef.current = 0
            }
        }

        const unsubscribe = on('ON_SNAPSHOT_SYNC', handleSnapshotSync)
        return () => unsubscribe()
    }, [chatflowId, on])

    // Periodic snapshot sync - sync every 60 seconds to prevent drift
    useEffect(() => {
        if (!hasJoined || !chatflowId || !sessionId) return

        const syncInterval = setInterval(() => {
            send('REQUEST_SNAPSHOT_SYNC', {
                chatflowId,
                sessionId,
                timestamp: Date.now()
            })
        }, PERIODIC_SYNC_INTERVAL)

        return () => clearInterval(syncInterval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasJoined, chatflowId, sessionId])

    // Clean up stale remote cursors periodically
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = Date.now()
            setRemoteCursors((prev) => {
                const updated = { ...prev }
                let hasChanges = false

                Object.keys(updated).forEach((key) => {
                    if (now - updated[key].lastSeen > CURSOR_TIMEOUT) {
                        delete updated[key]
                        hasChanges = true
                    }
                })

                return hasChanges ? updated : prev
            })
        }, CURSOR_CLEANUP_INTERVAL)

        return () => clearInterval(cleanupInterval)
    }, [CURSOR_CLEANUP_INTERVAL, CURSOR_TIMEOUT])

    // Send heartbeat to maintain presence and status (active/idle/away)
    useEffect(() => {
        if (!hasJoined || !chatflowId || !sessionId) return
        send('USER_HEARTBEAT', {
            chatflowId,
            sessionId,
            status: userStatus,
            timestamp: Date.now()
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasJoined, chatflowId, sessionId, userStatus])

    // Request snapshot sync manually
    const requestSnapshotSync = useCallback(() => {
        if (!hasJoined || !chatflowId) return

        send('REQUEST_SNAPSHOT_SYNC', {
            chatflowId,
            sessionId,
            timestamp: Date.now()
        })
    }, [hasJoined, chatflowId, sessionId, send])

    // Send node updated event
    const updateNode = useCallback(
        (node, changeType) => {
            send('NODE_UPDATED', {
                chatflowId,
                node,
                changeType,
                timestamp: Date.now()
            })

            // Track local changes for activity-based sync
            localChangeCountRef.current += 1
            if (localChangeCountRef.current >= SYNC_THRESHOLD) {
                requestSnapshotSync()
            }
        },
        [chatflowId, send, SYNC_THRESHOLD, requestSnapshotSync]
    )

    // Send edge updated event
    const updateEdge = useCallback(
        (edge, changeType) => {
            send('EDGE_UPDATED', {
                chatflowId,
                edge,
                changeType,
                timestamp: Date.now()
            })

            // Track local changes for activity-based sync
            localChangeCountRef.current += 1
            if (localChangeCountRef.current >= SYNC_THRESHOLD) {
                requestSnapshotSync()
            }
        },
        [chatflowId, send, SYNC_THRESHOLD, requestSnapshotSync]
    )

    // Send cursor movement event
    const sendCursorMove = useCallback(
        (x, y) => {
            if (!hasJoined || !chatflowId || !sessionId) return

            // Get user color from activeUsers if available, otherwise generate it
            const currentUser = activeUsers.find((u) => u.sessionId === sessionId)
            const userColor = currentUser?.color || '#5F9EA0'

            send('CURSOR_MOVED', {
                chatflowId,
                sessionId,
                x,
                y,
                name: currentUser.name,
                color: userColor,
                timestamp: Date.now()
            })
        },
        [hasJoined, chatflowId, sessionId, activeUsers, send]
    )

    // Update user color
    const updateUserColor = useCallback(
        (newColor) => {
            if (!hasJoined || !chatflowId || !sessionId) return

            send('USER_COLOR_UPDATED', {
                chatflowId,
                color: newColor,
                sessionId,
                timestamp: Date.now()
            })

            // Optimistically update local state
            setActiveUsers((prev) => prev.map((u) => (u.sessionId === sessionId ? { ...u, color: newColor } : u)))
        },
        [hasJoined, chatflowId, sessionId, send, setActiveUsers]
    )

    // Send node presence event
    const sendNodePresence = useCallback(
        (nodeId, action) => {
            if (!hasJoined || !chatflowId || !sessionId) return

            send('NODE_PRESENCE_UPDATED', {
                chatflowId,
                nodeId,
                sessionId,
                action, // 'enter' | 'leave' | 'edit_start' | 'edit_end'
                timestamp: Date.now()
            })
        },
        [chatflowId, hasJoined, send, sessionId]
    )

    return {
        remoteChanges,
        remoteCursors,
        snapshotSync,
        sessionId,
        updateNode,
        updateEdge,
        sendCursorMove,
        updateUserColor,
        sendNodePresence,
        requestSnapshotSync
    }
}
