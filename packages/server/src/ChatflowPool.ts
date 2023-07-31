import { ICommonObject } from 'flowise-components'
import { IActiveChatflows, INodeData, IReactFlowNode } from './Interface'
import logger from './utils/logger'

/**
 * This pool is to keep track of active chatflow pools
 * so we can prevent building langchain flow all over again
 */
export class ChatflowPool {
    activeChatflows: IActiveChatflows = {}

    /**
     * Add to the pool
     * @param {string} chatflowid
     * @param {INodeData} endingNodeData
     * @param {IReactFlowNode[]} startingNodes
     * @param {ICommonObject} overrideConfig
     */
    add(chatflowid: string, endingNodeData: INodeData, startingNodes: IReactFlowNode[], overrideConfig?: ICommonObject) {
        this.activeChatflows[chatflowid] = {
            startingNodes,
            endingNodeData,
            inSync: true
        }
        if (overrideConfig) this.activeChatflows[chatflowid].overrideConfig = overrideConfig
        logger.info(`[server]: Chatflow ${chatflowid} added into ChatflowPool`)
    }

    /**
     * Update to the pool
     * @param {string} chatflowid
     * @param {boolean} inSync
     */
    updateInSync(chatflowid: string, inSync: boolean) {
        if (Object.prototype.hasOwnProperty.call(this.activeChatflows, chatflowid)) {
            this.activeChatflows[chatflowid].inSync = inSync
            logger.info(`[server]: Chatflow ${chatflowid} updated inSync=${inSync} in ChatflowPool`)
        }
    }

    /**
     * Remove from the pool
     * @param {string} chatflowid
     */
    async remove(chatflowid: string) {
        if (Object.prototype.hasOwnProperty.call(this.activeChatflows, chatflowid)) {
            delete this.activeChatflows[chatflowid]
            logger.info(`[server]: Chatflow ${chatflowid} removed from ChatflowPool`)
        }
    }
}
