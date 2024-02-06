import { BaseNode, Metadata } from 'llamaindex'

export const reformatSourceDocuments = (sourceNodes: BaseNode<Metadata>[]) => {
    const sourceDocuments = []
    for (const node of sourceNodes) {
        sourceDocuments.push({
            pageContent: (node as any).text,
            metadata: node.metadata
        })
    }
    return sourceDocuments
}
