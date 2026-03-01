import WebSocket from 'ws'
import { LoggedInUser } from '../Interface.Enterprise'

/**
 * Extended WebSocket interface with authenticated user information
 */
export interface AuthenticatedWebSocket extends WebSocket {
    /**
     * The authenticated user associated with this WebSocket connection
     * Will be undefined if authentication failed
     */
    user?: LoggedInUser

    /**
     * Unique session identifier for this WebSocket connection
     * Used for excluding sockets from broadcasts
     */
    sessionId?: string
}

/**
 * Helper function to check if a socket has an authenticated user
 */
export function isAuthenticated(socket: WebSocket): socket is AuthenticatedWebSocket & { user: LoggedInUser } {
    return !!(socket as AuthenticatedWebSocket).user
}

/**
 * Helper function to get the authenticated user from a socket
 * Throws an error if the socket is not authenticated
 */
export function getAuthenticatedUser(socket: WebSocket): LoggedInUser {
    const authSocket = socket as AuthenticatedWebSocket
    if (!authSocket.user) {
        throw new Error('Socket is not authenticated')
    }
    return authSocket.user
}
