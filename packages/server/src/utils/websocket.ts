import { Server, WebSocket as WS } from 'ws'
import { Server as HttpServer } from 'http'
import logger from './logger'

// 扩展 WebSocket 接口
interface WebSocket extends WS {
    isAlive: boolean
    chatflowid: string
}

export class WebSocketService {
    private static instance: WebSocketService | null = null
    private wss: Server | null = null
    private clients: Map<string, Set<WebSocket>> = new Map()
    private pingInterval: NodeJS.Timeout | null = null
    private readonly PING_INTERVAL = 30000 // 30 seconds

    private constructor() {
        // 私有构造函数
    }

    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService()
        }
        return WebSocketService.instance
    }

    public initialize(server: HttpServer) {
        if (this.wss) {
            logger.warn('WebSocket server already initialized')
            return
        }

        try {
            this.wss = new Server({
                server,
                path: '/api/v1/ws',
                // 增加心跳检测配置
                clientTracking: true,
                perMessageDeflate: false,
                maxPayload: 64 * 1024 // 64KB
            })

            this.wss.on('connection', (ws: WebSocket, req: any) => {
                const chatflowid = this.extractChatflowId(req.url)
                if (!chatflowid) {
                    logger.error('No chatflowid provided in WebSocket connection')
                    ws.close(1002, 'No chatflowid provided')
                    return
                }

                // 设置 WebSocket 属性
                ws.isAlive = true
                ws.chatflowid = chatflowid

                // 处理 pong 消息
                ws.on('pong', () => {
                    ws.isAlive = true
                })

                // 处理错误
                ws.on('error', (error) => {
                    logger.error(`WebSocket error for chatflow ${chatflowid}:`, error)
                })

                this.addClient(chatflowid, ws)

                // 发送欢迎消息
                ws.send(
                    JSON.stringify({
                        type: 'system',
                        message: 'Connected successfully'
                    })
                )

                ws.on('close', (code, reason) => {
                    logger.debug(`Client disconnected from chatflow ${chatflowid}. Code: ${code}, Reason: ${reason}`)
                    this.removeClient(chatflowid, ws)
                })

                ws.on('message', (message) => {
                    try {
                        const data = JSON.parse(message.toString())
                        logger.debug(`Received message from chatflow ${chatflowid}:`, data)
                        // 处理接收到的消息
                        this.handleIncomingMessage(chatflowid, data)
                    } catch (error) {
                        logger.error(`Error handling message from chatflow ${chatflowid}:`, error)
                    }
                })
            })

            // 启动心跳检测
            this.startHeartbeat()

            this.wss.on('error', (error) => {
                logger.error('WebSocket server error:', error)
            })

            logger.info('✅ WebSocket server initialized successfully')
        } catch (error) {
            logger.error('Failed to initialize WebSocket server:', error)
            throw error
        }
    }

    private startHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
        }

        this.pingInterval = setInterval(() => {
            if (!this.wss) return

            this.wss.clients.forEach((ws) => {
                const client = ws as WebSocket
                if (client.isAlive === false) {
                    logger.debug(`Terminating inactive connection for chatflow ${client.chatflowid}`)
                    return client.terminate()
                }

                client.isAlive = false
                client.ping()
            })
        }, this.PING_INTERVAL)
    }

    private handleIncomingMessage(chatflowid: string, data: any) {
        // 这里可以添加消息处理逻辑
        logger.debug(`Processing message for chatflow ${chatflowid}:`, data)
    }

    private extractChatflowId(url: string): string | null {
        const match = url.match(/chatflowid=([^&]+)/)
        return match ? match[1] : null
    }

    private addClient(chatflowid: string, ws: WebSocket) {
        if (!this.clients.has(chatflowid)) {
            this.clients.set(chatflowid, new Set())
        }
        this.clients.get(chatflowid)?.add(ws)
        logger.debug(`Client added to chatflow ${chatflowid}. Total clients: ${this.clients.get(chatflowid)?.size}`)
    }

    private removeClient(chatflowid: string, ws: WebSocket) {
        const clientSet = this.clients.get(chatflowid)
        if (clientSet) {
            clientSet.delete(ws)
            if (clientSet.size === 0) {
                this.clients.delete(chatflowid)
                logger.debug(`Removed empty client set for chatflow ${chatflowid}`)
            }
            logger.debug(`Client removed from chatflow ${chatflowid}. Remaining clients: ${clientSet.size}`)
        }
    }

    public sendMessage(chatflowid: string, message: any) {
        logger.debug(`Attempting to send message to chatflow ${chatflowid}:`, message)
        const clientsSet = this.clients.get(chatflowid)
        if (!clientsSet || clientsSet.size === 0) {
            logger.warn(`No clients found for chatflow ${chatflowid}`)
            return
        }

        logger.debug(`Found ${clientsSet.size} clients for chatflow ${chatflowid}`)
        const messageStr = JSON.stringify(message)
        let successCount = 0
        let failureCount = 0

        for (const client of clientsSet) {
            try {
                logger.debug(`Client readyState for chatflow ${chatflowid}: ${client.readyState}`)
                if (client.readyState === WS.OPEN) {
                    client.send(messageStr)
                    successCount++
                    logger.debug(`Successfully sent message to client in chatflow ${chatflowid}`)
                } else {
                    failureCount++
                    logger.warn(`Client for chatflow ${chatflowid} not ready (state: ${client.readyState})`)
                }
            } catch (error) {
                failureCount++
                logger.error(`Error sending message to client in chatflow ${chatflowid}:`, error)
            }
        }

        logger.debug(`Message sent to chatflow ${chatflowid}. Success: ${successCount}, Failed: ${failureCount}`)
    }

    public cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval)
            this.pingInterval = null
        }

        if (this.wss) {
            this.wss.clients.forEach((client) => {
                try {
                    client.terminate()
                } catch (error) {
                    logger.error('Error terminating client:', error)
                }
            })
            this.wss.close(() => {
                logger.info('WebSocket server closed')
            })
            this.wss = null
        }

        this.clients.clear()
    }
}
