import { ICommonObject } from 'flowise-components'
import { IActiveChatflows, INodeData, IReactFlowNode } from './Interface'

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
    }

    /**
     * Update to the pool
     * @param {string} chatflowid
     * @param {boolean} inSync
     */
    updateInSync(chatflowid: string, inSync: boolean) {
        if (Object.prototype.hasOwnProperty.call(this.activeChatflows, chatflowid)) {
            this.activeChatflows[chatflowid].inSync = inSync
        }
    }

    /**
     * Remove from the pool
     * @param {string} chatflowid
     */
    async remove(chatflowid: string) {
        if (Object.prototype.hasOwnProperty.call(this.activeChatflows, chatflowid)) {
            delete this.activeChatflows[chatflowid]
        }
    }
}
