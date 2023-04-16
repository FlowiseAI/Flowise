import { IActiveChatflows, INodeData } from './Interface'

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
     */
    add(chatflowid: string, endingNodeData: INodeData) {
        this.activeChatflows[chatflowid] = {
            endingNodeData,
            inSync: true
        }
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
