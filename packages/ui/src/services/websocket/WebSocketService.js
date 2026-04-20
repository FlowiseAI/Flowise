import webSocketApi from '@/api/websocket'

class WebSocketService {
    constructor() {
        this.ws = null
        this.sessionId = null // Will be generated on connect
        this.reconnectAttempts = 0
        this.maxReconnectAttempts = 10 // Increased from 5
        this.reconnectDelay = 1000
        this.listeners = new Map()
        this.isConnecting = false
        this.isReconnecting = false
        this.connectionState = 'disconnected' // disconnected, connecting, connected, reconnecting
        this.host = import.meta.env.VITE_WS_HOST || window.location.host
        this.healthStatus = 'healthy' // healthy, warning, critical
        this.healthCheckInterval = null
        this.baseReconnectDelay = 1000
        this.maxReconnectDelay = 30000 // Maximum 30 seconds between reconnects
        this.connectionBlocked = false
        this.reconnectTimer = null
        this.manualDisconnect = false

        // Listen for online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.handleOnline())
            window.addEventListener('offline', () => this.handleOffline())
        }
    }

    /**
     * Set sessionId in cookie so server can access it
     */
    setSessionIdCookie(sessionId) {
        if (typeof document !== 'undefined') {
            // Set cookie with SameSite=Lax for WebSocket upgrade request compatibility
            document.cookie = `ws_session_id=${sessionId}; path=/; SameSite=Lax; max-age=86400`
        }
    }

    /**
     * Get sessionId from cookie
     */
    getSessionIdFromCookie() {
        if (typeof document !== 'undefined') {
            const cookie = document.cookie.split('; ').find((row) => row.startsWith('ws_session_id='))
            return cookie ? cookie.split('=')[1] : null
        }
        return null
    }

    async checkServerHealth() {
        try {
            const response = await webSocketApi.checkWebSocketHealth()
            const data = response.data

            this.healthStatus = data.status

            // Adjust reconnection strategy based on health
            if (data.status === 'critical') {
                this.reconnectDelay = 30000 // Wait 30s if critical
            } else if (data.status === 'warning') {
                this.reconnectDelay = 10000 // Wait 10s if warning
            } else {
                this.reconnectDelay = this.baseReconnectDelay // Normal 1s
            }

            this.emit('health-status', {
                status: data.status,
                utilization: data.utilization,
                activeConnections: data.activeConnections,
                maxConnections: data.maxConnections
            })

            return data.status
        } catch (error) {
            console.error('Health check failed:', error)
            return null
        }
    }

    handleOnline() {
        this.emit('network-online')
        // Attempt immediate reconnect when network comes back
        if (!this.isConnected() && !this.isConnecting && !this.manualDisconnect) {
            this.reconnectAttempts = 0 // Reset attempts on network restore
            this.connect()
        }
    }

    handleOffline() {
        this.emit('network-offline')
        this.connectionState = 'disconnected'
        this.emit('connection-state-changed', { state: 'disconnected', reason: 'network-offline' })
    }

    startHealthMonitoring() {
        // Stop any existing interval to prevent duplicates
        this.stopHealthMonitoring()

        // Check health every minute
        this.healthCheckInterval = setInterval(() => {
            if (this.isConnected()) {
                this.checkServerHealth()
            }
        }, 60000)
    }

    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval)
            this.healthCheckInterval = null
        }
    }

    async connect(url) {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            return Promise.resolve()
        }

        this.isConnecting = true
        // Check health before connecting
        const healthStatus = await this.checkServerHealth()
        if (healthStatus === 'critical') {
            console.warn('⚠️ Server at capacity, delaying connection')
            this.connectionBlocked = true
            this.connectionState = 'disconnected'
            this.emit('connection-blocked', {
                reason: 'Server at capacity',
                retryAfter: this.reconnectDelay
            })
            this.emit('connection-state-changed', { state: 'disconnected', reason: 'server-capacity' })
            // Schedule retry
            setTimeout(() => {
                this.connectionBlocked = false
                this.connect(url)
            }, this.reconnectDelay)
            return Promise.reject(new Error('Server at capacity'))
        }

        this.connectionState = this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting'
        this.emit('connection-state-changed', {
            state: this.connectionState,
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts
        })

        return new Promise((resolve, reject) => {
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
                const wsUrl = url || `${protocol}//${this.host}`

                // Generate sessionId before connection (reuse existing from cookie on reconnect)
                const wasReconnecting = this.reconnectAttempts > 0
                if (!this.sessionId) {
                    // Try to get from cookie first (in case of page refresh)
                    this.sessionId = this.getSessionIdFromCookie()
                }
                if (!this.sessionId || !wasReconnecting) {
                    // Generate new sessionId
                    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                }
                // Store sessionId in cookie so it's sent with WebSocket upgrade request
                this.setSessionIdCookie(this.sessionId)

                // WebSocket will automatically include cookies from the same origin
                // This allows the server to authenticate via the JWT cookie and get sessionId
                this.ws = new WebSocket(wsUrl)

                this.ws.onopen = () => {
                    this.isConnecting = false
                    this.isReconnecting = false
                    this.connectionState = 'connected'
                    const wasReconnecting = this.reconnectAttempts > 0
                    this.reconnectAttempts = 0
                    this.connectionBlocked = false
                    this.startHealthMonitoring()
                    this.emit('connected', { wasReconnecting, sessionId: this.sessionId })
                    this.emit('connection-state-changed', { state: 'connected', wasReconnecting, sessionId: this.sessionId })
                    resolve()
                }

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)

                        // Handle rate limit response
                        if (data.type === 'rate-limit-exceeded') {
                            console.warn('⚠️ Rate limit exceeded. Retry after:', data.retryAfter)
                            this.emit('rate-limited', {
                                retryAfter: data.retryAfter,
                                message: data.message || 'Too many messages sent. Please slow down.'
                            })
                            return
                        }

                        this.emit(data.type, data)
                        this.emit('message', data)
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error)
                    }
                }

                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error)
                    this.isConnecting = false
                    this.emit('error', error)
                    reject(error)
                }

                this.ws.onclose = (event) => {
                    this.isConnecting = false
                    this.connectionState = 'disconnected'

                    // Handle authentication errors (code 4401)
                    if (event.code === 4401) {
                        console.error('❌ WebSocket authentication failed. Please log in again.')
                        this.emit('auth-error', { code: event.code, reason: event.reason })
                        this.emit('connection-state-changed', { state: 'disconnected', reason: 'auth-error' })
                        // Don't attempt reconnect on auth failure
                        return
                    }

                    // Don't reconnect if manually disconnected
                    if (this.manualDisconnect) {
                        this.emit('disconnected', { manual: true })
                        this.emit('connection-state-changed', { state: 'disconnected', reason: 'manual' })
                        return
                    }

                    this.emit('disconnected', { code: event.code, reason: event.reason })
                    this.emit('connection-state-changed', { state: 'disconnected', reason: 'connection-lost' })
                    this.attemptReconnect()
                }
            } catch (error) {
                this.isConnecting = false
                reject(error)
            }
        })
    }

    attemptReconnect() {
        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached')
            this.connectionState = 'disconnected'
            this.emit('reconnect-failed', {
                attempts: this.reconnectAttempts,
                maxAttempts: this.maxReconnectAttempts
            })
            this.emit('connection-state-changed', { state: 'disconnected', reason: 'max-retries' })
            return
        }

        this.reconnectAttempts++
        this.isReconnecting = true

        // Exponential backoff with jitter: base * 2^attempt + random(0-1000ms)
        const exponentialDelay = Math.min(this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay)
        const jitter = Math.random() * 1000
        const delay = exponentialDelay + jitter

        console.warn(
            `🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(delay / 1000)}s...`
        )

        this.emit('reconnecting', {
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            delay: Math.round(delay),
            nextAttemptAt: Date.now() + delay
        })

        this.reconnectTimer = setTimeout(() => {
            this.connect()
        }, delay)
    }

    send(type, payload = {}) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const message = JSON.stringify({ type, ...payload })
            this.ws.send(message)
            return true
        } else {
            console.warn('WebSocket is not connected')
            return false
        }
    }

    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set())
        }
        this.listeners.get(eventType).add(callback)

        // Return unsubscribe function
        return () => this.off(eventType, callback)
    }

    off(eventType, callback) {
        const callbacks = this.listeners.get(eventType)
        if (callbacks) {
            callbacks.delete(callback)
        }
    }

    emit(eventType, data) {
        const callbacks = this.listeners.get(eventType)
        if (callbacks) {
            callbacks.forEach((callback) => callback(data))
        }
    }

    disconnect(manual = true) {
        this.manualDisconnect = manual
        this.stopHealthMonitoring()

        // Clear reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }

        if (this.ws) {
            this.ws.close()
            this.ws = null
        }

        if (manual) {
            this.listeners.clear()
        }

        this.reconnectAttempts = 0
        this.connectionBlocked = false
        this.isReconnecting = false
        this.isConnecting = false
        this.connectionState = 'disconnected'
    }

    /**
     * Manually trigger a reconnection attempt (resets retry count)
     */
    forceReconnect() {
        this.manualDisconnect = false
        this.disconnect(false)
        this.reconnectAttempts = 0
        this.connect()
    }

    getConnectionState() {
        return {
            state: this.connectionState,
            isConnected: this.isConnected(),
            isReconnecting: this.isReconnecting,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            healthStatus: this.healthStatus
        }
    }

    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN
    }

    getSessionId() {
        return this.sessionId
    }
}

// Singleton instance
const webSocketService = new WebSocketService()

export default webSocketService
