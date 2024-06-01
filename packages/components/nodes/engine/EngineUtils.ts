import { Metadata, NodeWithScore } from 'llamaindex'

export const reformatSourceDocuments = (sourceNodes: NodeWithScore<Metadata>[]) => {
    const sourceDocuments = []
    for (const node of sourceNodes) {
        sourceDocuments.push({
            pageContent: (node.node as any).text,
            metadata: node.node.metadata
        })
    }
    return sourceDocuments
}
