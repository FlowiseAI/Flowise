import { EventEmitter } from 'events'
import logger from './logger'

export class WebSocketManager extends EventEmitter {
    private static instance: WebSocketManager
    private webSocketService: any

    private constructor() {
        super()
    }

    public static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager()
        }
        return WebSocketManager.instance
    }

    public setWebSocketService(service: any) {
        this.webSocketService = service
        logger.info('✅ WebSocket service registered successfully')
    }

    public sendMessage(chatflowid: string, message: any) {
        logger.info('Sending WebSocket message:', chatflowid, message)
        if (this.webSocketService) {
            try {
                this.webSocketService.sendMessage(chatflowid, message)
                logger.debug(`WebSocket message sent to chatflow ${chatflowid}`)
            } catch (error) {
                logger.error(`Error sending WebSocket message: ${error}`)
            }
        } else {
            logger.warn('WebSocket service not initialized')
        }
    }

    public getWebSocketService() {
        return this.webSocketService
    }
}
