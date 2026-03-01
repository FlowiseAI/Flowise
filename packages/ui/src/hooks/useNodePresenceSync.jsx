import { useEffect } from 'react'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { useCanvasPresence } from '@/contexts/CanvasPresenceContext'

/**
 * Hook to manage node presence synchronization with WebSocket
 * @param {string} chatflowId - The chat flow ID
 * @param {string} currentSessionId - Current user's session ID
 */
export const useNodePresenceSync = (chatflowId, currentSessionId) => {
    const { on } = useWebSocketContext()
    const { addNodePresence, removeNodePresence, removeUserPresence } = useCanvasPresence()

    // Listen for remote node presence events
    useEffect(() => {
        /**
         * Handle node presence events from other users
         * @param {object} data - { type: string, payload: { chatflowId, nodeId, userId, sessionId, action, timestamp } }
         */
        const handleNodePresence = (data) => {
            if (data.payload.chatflowId !== chatflowId) return
            if (data.payload.sessionId === currentSessionId) return // Ignore own events

            const { nodeId, sessionId, action } = data.payload

            switch (action) {
                case 'enter':
                    addNodePresence(nodeId, sessionId, 'hovering')
                    break
                case 'leave':
                    removeNodePresence(nodeId, sessionId, 'hovering')
                    removeUserPresence(sessionId)
                    break
                case 'edit_start':
                    // Remove from hovering, add to editing
                    removeNodePresence(nodeId, sessionId, 'hovering')
                    addNodePresence(nodeId, sessionId, 'editing')
                    break
                case 'edit_end':
                    removeNodePresence(nodeId, sessionId, 'editing')
                    removeUserPresence(sessionId)
                    break
                default:
                    break
            }
        }

        const unsubscribePresence = on('ON_NODE_PRESENCE_UPDATED', handleNodePresence)

        return () => {
            unsubscribePresence()
        }
    }, [chatflowId, currentSessionId, on, addNodePresence, removeNodePresence, removeUserPresence])

    // Cleanup on unmount or flow change
    useEffect(() => {
        return () => {
            // Could clear all presence here if needed
        }
    }, [chatflowId])
}
