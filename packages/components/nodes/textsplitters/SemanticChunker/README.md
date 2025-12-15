# Semantic Chunker

A text splitter that intelligently divides text based on semantic meaning rather than simple character counts or token limits.

## Overview

The Semantic Chunker uses embeddings to analyze the semantic similarity between consecutive text segments. It identifies natural breakpoints in the text where the meaning shifts, creating more coherent chunks that preserve semantic context.

## How It Works

1. **Sentence Splitting**: The text is first split into sentences using a robust sentence tokenizer that handles common abbreviations and edge cases.

2. **Embedding Generation**: Each sentence (with optional buffer context) is converted into an embedding vector using the provided embedding model.

3. **Similarity Analysis**: The cosine similarity is calculated between consecutive sentence embeddings to measure how semantically related they are.

4. **Breakpoint Detection**: Sentences with low similarity (below a calculated threshold) are identified as semantic boundaries where chunks should be split.

5. **Chunk Creation**: The text is divided at these natural breakpoints, creating chunks that maintain semantic coherence.

## Configuration

### Required Parameters

- **Embeddings**: An embeddings model (e.g., OpenAI Embeddings, HuggingFace Embeddings) that will be used to analyze semantic similarity.

### Optional Parameters

- **Breakpoint Threshold Type** (default: `percentile`)
  - `percentile`: Uses percentile of similarity scores
  - `standard_deviation`: Uses standard deviation from mean similarity
  - `interquartile`: Uses interquartile range of similarities

- **Breakpoint Threshold Amount** (default: `50`)
  - For percentile: 0-100 (lower = more splits, higher = fewer splits)
  - For standard deviation: multiplier (typically 1-3)
  - For interquartile: multiplier (typically 1-3)
  
  **Recommended values:**
  - Percentile: 25-50 for balanced splitting
  - Standard Deviation: 1.5-2.0 for moderate splitting
  - Interquartile: 1.5 for balanced splitting

- **Buffer Size** (default: `1`)
  - Number of surrounding sentences to include when generating embeddings
  - Higher values = more context but slower processing
  - Range: 0-3 (0 = no context, 3 = 3 sentences before and after)

## Use Cases

### Best For:
- Long documents with distinct topics or sections
- Content that needs to maintain semantic coherence
- RAG (Retrieval Augmented Generation) applications
- Question-answering systems where context is crucial
- Documents with natural topic transitions

### Not Ideal For:
- Very short texts (< 3 sentences)
- Code snippets (use Code Text Splitter instead)
- Highly structured data (use specialized splitters)
- When deterministic, character-based splitting is required

## Example Configurations

### Aggressive Splitting (More, Smaller Chunks)
```
Breakpoint Threshold Type: percentile
Breakpoint Threshold Amount: 25
Buffer Size: 1
```

### Balanced Splitting (Moderate Chunks)
```
Breakpoint Threshold Type: percentile
Breakpoint Threshold Amount: 50
Buffer Size: 1
```

### Conservative Splitting (Fewer, Larger Chunks)
```
Breakpoint Threshold Type: percentile
Breakpoint Threshold Amount: 75
Buffer Size: 2
```

### High Context Awareness
```
Breakpoint Threshold Type: standard_deviation
Breakpoint Threshold Amount: 1.5
Buffer Size: 3
```

## Performance Considerations

- **Processing Speed**: Slower than character-based splitters due to embedding generation
- **API Calls**: Requires embedding API calls for each sentence group
- **Memory**: Embeddings are generated in batches, so memory usage is moderate
- **Cost**: May incur API costs if using paid embedding services

## Tips

1. Start with default settings (percentile: 50, buffer: 1) and adjust based on results
2. Use lower percentile values (25-40) for documents with frequent topic changes
3. Use higher percentile values (60-75) for documents with closely related content
4. Increase buffer size for documents where broader context is important
5. Test different threshold types to find what works best for your specific content

## Compatibility

- Works with all Flowise embedding models
- Compatible with all document loaders
- Can be chained with other text processing nodes
- Outputs standard text chunks that work with all vector stores
