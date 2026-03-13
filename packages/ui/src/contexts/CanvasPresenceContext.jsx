import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useWebSocketContext } from '@/contexts/WebSocketContext'

/**
 * Available colors for user avatars and cursors
 */
export const AVAILABLE_COLORS = [
    '#5F9EA0', // Cadet Blue
    '#7B87AB', // Purple/Blue
    '#4A90B5', // Steel Blue
    '#82B366', // Green
    '#D4A574', // Orange
    '#E57373', // Red
    '#BA68C8', // Purple
    '#4DB6AC', // Teal
    '#FFB74D', // Amber
    '#F06292' // Pink
]

/**
 * Generate a consistent color for a user based on their ID
 * @param {string} userId - The user ID
 * @returns {string} A hex color code
 */
const generateUserColor = (userId) => {
    // Generate consistent index from userId
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % AVAILABLE_COLORS.length
    return AVAILABLE_COLORS[index]
}

/**
 * Node presence types
 */
export const NodePresenceType = {
    HOVERING: 'hovering',
    EDITING: 'editing'
}

/**
 * Node presence store structure:
 * {
 *   [nodeId]: {
 *     hovering: Set<userId>,
 *     editing: Set<userId>
 *   }
 * }
 */

const initialValue = {
    hasJoined: false,
    sessionId: null,
    chatflowId: null,
    presenceByNodeId: {},
    sessionPresenceMap: {},
    activeUsers: [],
    joinError: null,
    joinChatflow: () => {},
    leaveChatflow: (_chatflowId, _sessionId) => {},
    setActiveUsers: () => {},
    addNodePresence: () => {},
    removeNodePresence: () => {},
    removeUserPresence: () => {},
    clearAllPresence: () => {},
    getNodePresence: () => {},
    getUserPresence: () => {},
    sendNodePresence: () => {}
}

export const CanvasPresenceContext = createContext(initialValue)

/**
 * @returns {CanvasPresenceContext}
 */
export const useCanvasPresence = () => {
    const context = useContext(CanvasPresenceContext)
    if (!context) {
        throw new Error('useCanvasPresence must be used within CanvasPresenceProvider')
    }
    return context
}

/**
 * Provider component for CanvasPresenceContext (manages user and node presence)
 */
export const CanvasPresenceProvider = ({ children }) => {
    // Contexts
    const { isConnected, sessionId: wsSessionId, send, authorizationError } = useWebSocketContext()

    // Join
    const [hasJoined, setHasJoined] = useState(false)
    const [chatflowId, setChatflowId] = useState(null)
    const [joinError, setJoinError] = useState(null)

    // Presence data
    const [presenceByNodeId, setPresenceByNodeId] = useState({}) // nodeId -> { hovering: Set<sessionId>, editing: Set<sessionId> }
    const [sessionPresenceMap, setSessionPresenceMap] = useState({}) // sessionId -> { nodeId, type }
    const [activeUsers, setActiveUsers] = useState([]) // Array of active users with their metadata { id, name, color, sessionId }

    // Handle authorization errors
    useEffect(() => {
        if (authorizationError) {
            console.error('Authorization error:', authorizationError.message)
            setJoinError(authorizationError.message)
            // Reset join state on authorization error
            setHasJoined(false)
            // Don't clear chatflowId so we know which chatflow had the error
        }
    }, [authorizationError])

    const joinChatflow = useCallback(
        (chatflowId, user) => {
            if (isConnected && chatflowId && user?.id && !hasJoined && wsSessionId) {
                // Clear any previous errors
                setJoinError(null)

                // Generate consistent color for this user
                const userColor = generateUserColor(user.id)
                setChatflowId(chatflowId)
                setHasJoined(true)
                send('JOIN_CHAT_FLOW', {
                    chatflowId,
                    sessionId: wsSessionId,
                    color: userColor,
                    timestamp: Date.now()
                })
            }
        },
        [isConnected, wsSessionId, send, hasJoined]
    )

    const leaveChatflow = useCallback(
        (chatflowId) => {
            if (!wsSessionId) return

            setHasJoined(false)
            setChatflowId(null)
            // Optionally clear presence data on leave
            setPresenceByNodeId({})
            setSessionPresenceMap({})
            send('LEAVE_CHAT_FLOW', {
                chatflowId,
                sessionId: wsSessionId,
                timestamp: Date.now()
            })
        },
        [wsSessionId, send]
    )

    const sendNodePresence = useCallback(
        (nodeId, action) => {
            if (!hasJoined || !chatflowId || !wsSessionId) return

            send('NODE_PRESENCE_UPDATED', {
                chatflowId,
                nodeId,
                sessionId: wsSessionId,
                action, // 'enter' | 'leave' | 'edit_start' | 'edit_end'
                timestamp: Date.now()
            })
        },
        [hasJoined, chatflowId, wsSessionId, send]
    )

    /**
     * Add presence for a user on a node
     * @param {string} nodeId - The node ID
     * @param {string} sessionId - The user session object
     * @param {string} type - The presence type ('hovering' | 'editing')
     */
    const addNodePresence = useCallback((nodeId, sessionId, type) => {
        setPresenceByNodeId((prev) => {
            const nodePresence = prev[nodeId] || { hovering: new Set(), editing: new Set() }
            const newSet = new Set(nodePresence[type])
            newSet.add(sessionId)
            return {
                ...prev,
                [nodeId]: {
                    ...nodePresence,
                    [type]: newSet
                }
            }
        })

        // Track user's current presence
        setSessionPresenceMap((prev) => ({
            ...prev,
            [sessionId]: { nodeId, type }
        }))
    }, [])

    /**
     * Remove presence for a user on a node
     */
    const removeNodePresence = useCallback((nodeId, sessionId, type) => {
        setPresenceByNodeId((prev) => {
            const nodePresence = prev[nodeId]
            if (!nodePresence) return prev

            const newSet = new Set(nodePresence[type])
            newSet.delete(sessionId)

            // Clean up empty node entries
            const isNodeEmpty = newSet.size === 0 && nodePresence[type === 'hovering' ? 'editing' : 'hovering'].size === 0

            if (isNodeEmpty) {
                const { [nodeId]: _, ...rest } = prev
                return rest
            }

            return {
                ...prev,
                [nodeId]: {
                    ...nodePresence,
                    [type]: newSet
                }
            }
        })

        // Clean up user presence map
        setSessionPresenceMap((prev) => {
            const userPresence = prev[sessionId]
            if (userPresence?.nodeId === nodeId && userPresence?.type === type) {
                const { [sessionId]: _, ...rest } = prev
                return rest
            }
            return prev
        })
    }, [])

    /**
     * Remove all presence for a user
     */
    const removeUserPresence = useCallback((sessionId) => {
        setPresenceByNodeId((prev) => {
            const newState = { ...prev }

            Object.keys(newState).forEach((nodeId) => {
                const nodePresence = newState[nodeId]
                nodePresence.hovering.delete(sessionId)
                nodePresence.editing.delete(sessionId)

                // Clean up empty entries
                if (nodePresence.hovering.size === 0 && nodePresence.editing.size === 0) {
                    delete newState[nodeId]
                }
            })

            return newState
        })

        setSessionPresenceMap((prev) => {
            const { [sessionId]: _, ...rest } = prev
            return rest
        })
    }, [])

    /**
     * Clear all presence
     */
    const clearAllPresence = useCallback(() => {
        setPresenceByNodeId({})
        setSessionPresenceMap({})
    }, [])

    /**
     * Get presence for a specific node
     */
    const getNodePresence = useCallback(
        (nodeId) => {
            return presenceByNodeId[nodeId] || { hovering: new Set(), editing: new Set() }
        },
        [presenceByNodeId]
    )

    /**
     * Get what node a user is currently interacting with
     */
    const getUserPresence = useCallback(
        (sessionId) => {
            return sessionPresenceMap[sessionId] || null
        },
        [sessionPresenceMap]
    )

    const value = {
        hasJoined,
        sessionId: wsSessionId,
        chatflowId,
        joinError,
        presenceByNodeId,
        sessionPresenceMap,
        activeUsers,
        joinChatflow,
        leaveChatflow,
        setActiveUsers,
        addNodePresence,
        removeNodePresence,
        removeUserPresence,
        clearAllPresence,
        getNodePresence,
        getUserPresence,
        sendNodePresence
    }

    return <CanvasPresenceContext.Provider value={value}>{children}</CanvasPresenceContext.Provider>
}

CanvasPresenceProvider.propTypes = {
    children: PropTypes.node.isRequired
}
