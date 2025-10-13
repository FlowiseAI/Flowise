# EnsembleRetriever and BM25Retriever Implementation Analysis

## Summary
Investigation into implementing EnsembleRetriever and BM25Retriever nodes for Flowise AgentFlow v2.

## Current Status: ✅ Ready to Implement
- **EnsembleRetriever**: ❌ Not implemented in codebase
- **BM25Retriever**: ❌ Not implemented in codebase
- **LangChain JS Support**: ✅ Both fully supported

## LangChain JS Documentation

### EnsembleRetriever
- **Main Guide**: https://js.langchain.com/docs/how_to/ensemble_retriever/
- **API Reference**: https://v03.api.js.langchain.com/classes/langchain.retrievers_ensemble.EnsembleRetriever.html
- **Import**: `import { EnsembleRetriever } from "langchain/retrievers/ensemble"`
- **Features**: Reciprocal Rank Fusion, weighted retriever combination, hybrid search

### BM25Retriever  
- **Main Guide**: https://js.langchain.com/docs/integrations/retrievers/bm25/
- **Package**: `@langchain/community/retrievers/bm25`
- **Features**: Okapi BM25 algorithm, keyword-based ranking

## Implementation Decision

**Recommendation**: Create dedicated nodes (not CustomFunction) because:
1. **Type Safety**: Proper TypeScript interfaces and validation
2. **UI Integration**: Better visual flow builder integration
3. **Reusability**: Easy reuse across different flows
4. **Maintenance**: Easier to maintain and update
5. **LangChain Integration**: Direct ecosystem compatibility

## Node Type: ChatFlow vs AgentFlow

### ChatFlow Nodes (Standard Retrievers)
- **Category**: "Retrievers"
- **Pattern**: Standard LangChain component wrappers
- **Execution**: `init()` method for retriever creation
- **State**: Stateless, immediate response
- **Use Case**: Core retrieval components

### AgentFlow Nodes (Flow Orchestration)
- **Category**: "Agent Flows" 
- **Pattern**: State-aware with runtime context
- **Execution**: `run()` method with streaming
- **State**: Stateful with flow state management
- **Use Case**: Visual workflow orchestration

**Decision**: Implement as **standard Retriever nodes** (ChatFlow style) since they're core retrieval components.

## Implementation Plan

### 1. BM25Retriever Node
**Location**: `packages/components/nodes/retrievers/BM25Retriever/BM25Retriever.ts`

**Inputs**:
- Documents array or Document Store selection
- Top K results
- Query (optional, uses input if not specified)

**Outputs**:
- Retriever object
- Document array
- Text concatenation

### 2. EnsembleRetriever Node
**Location**: `packages/components/nodes/retrievers/EnsembleRetriever/EnsembleRetriever.ts`

**Inputs**:
- Multiple BaseRetriever inputs
- Weights array (optional, defaults to equal)
- Top K results
- Query (optional)

**Outputs**:
- Retriever object
- Document array  
- Text concatenation

## Existing Retriever Pattern Reference

**Base Pattern** (from RRFRetriever):
```typescript
class RetrieverName_Retrievers implements INode {
    label: string
    name: string
    category: string = 'Retrievers'
    baseClasses: string[] = [this.type, 'BaseRetriever']
    
    inputs: INodeParams[] = [
        // Configuration inputs
    ]
    
    outputs: INodeOutputsValue[] = [
        {
            label: 'Retriever',
            name: 'retriever',
            baseClasses: this.baseClasses
        },
        {
            label: 'Document',
            name: 'document',
            baseClasses: ['Document', 'json']
        },
        {
            label: 'Text',
            name: 'text', 
            baseClasses: ['string', 'json']
        }
    ]
    
    async init(nodeData: INodeData, input: string): Promise<any> {
        // Implementation
        const output = nodeData.outputs?.output as string
        if (output === 'retriever') return retriever
        else if (output === 'document') return await retriever.getRelevantDocuments(query)
        else if (output === 'text') return concatenatedText
        return retriever
    }
}
```

## Next Steps
1. Implement BM25Retriever node following existing pattern
2. Implement EnsembleRetriever node following existing pattern
3. Add to component exports and build configuration
4. Test integration with existing flows