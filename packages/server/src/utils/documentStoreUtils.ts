import { ChatFlow } from '../database/entities/ChatFlow'

export const containsDocumentStore = (chatflow: ChatFlow) => {
    // const data = JSON.parse(chatflow.flowData)

    // const found = data.nodes.find((node: any) => node.data['name'] === 'documentStore')
    // if (found) {
    //     const storeId = found.data?.inputs['selectedStore']
    //     console.log('storeid', storeId)
    // }

    return false
}
