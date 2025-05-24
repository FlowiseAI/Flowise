---
description: Cache generated Embeddings in memory for improved performance and efficiency
---

# InMemory Embedding Cache

## Overview

The InMemory Embedding Cache feature in AnswerAI allows you to store generated embeddings in local memory. This caching mechanism improves performance by avoiding the need to recompute embeddings for previously processed text, leading to faster response times and reduced computational overhead.

## Key Benefits

-   Faster processing of repeated or similar text inputs
-   Reduced computational resource usage
-   Improved overall system efficiency and response time

## How to Use

1. Add the InMemory Embedding Cache node to your AnswerAI workflow:
 <figure><img src="/.gitbook/assets/screenshots/inmemory embedding cache.png" alt="" /><figcaption><p>In Memory Embedding Cache &#x26; Drop UI</p></figcaption></figure><!-- TODO: Screenshot of adding InMemory Embedding Cache node to the workflow -->

2. Configure the InMemory Embedding Cache node:

    - Connect an Embeddings node to the "Embeddings" input.
    - (Optional) Specify a "Namespace" for the cache.
      <!-- TODO: Screenshot showing the configuration of the InMemory Embedding Cache node -->
      <figure><img src="/.gitbook/assets/screenshots/inmemory embedding cache configuration.png" alt="" /><figcaption><p>In Memory Embedding Cache Configuration &#x26; Drop UI</p></figcaption></figure>

3. Connect the InMemory Embedding Cache node to other nodes in your workflow that require embeddings:
       <!-- TODO: Screenshot showing the connection between InMemory Embedding Cache and other relevant nodes -->
    <figure><img src="/.gitbook/assets/screenshots/inmemoery embedding cache in a workflow.png" alt="" /><figcaption><p>In Memory Embedding Cache In A Workflow &#x26; Drop UI</p></figcaption></figure>
4. Run your workflow:
    - The first time a unique text is processed, its embedding will be computed and cached.
    - Subsequent identical or similar texts will retrieve the cached embedding, improving performance.

## Tips and Best Practices

1. Use caching for repetitive or similar text inputs:

    - Ideal for processing documents with recurring phrases or concepts.
    - Effective for chatbots or Q&A systems with frequently asked questions.

2. Consider namespace usage:

    - Use namespaces to organize embeddings for different purposes or datasets.
    - This can help manage cache entries and prevent conflicts between different parts of your application.

3. Monitor memory usage:

    - Keep in mind that the cache is stored in memory, which may impact your application's overall memory footprint.
    - Consider implementing a cache size limit or periodic clearing mechanism for long-running applications.

4. Combine with persistent storage:

    - For long-term caching across application restarts, consider implementing a database-backed embedding cache alongside the in-memory cache.

5. Evaluate cache hit rate:
    - Monitor how often cached embeddings are being used versus new computations.
    - This can help you optimize your workflow and identify areas where caching is most beneficial.

## Troubleshooting

1. Unexpected or inconsistent results:

    - Ensure that the Embeddings node connected to the InMemory Embedding Cache is correctly configured.
    - Verify that the cache namespace (if used) is consistent across relevant parts of your workflow.

2. High memory usage:

    - If your application processes a large volume of unique text, consider implementing a cache eviction strategy or size limit.
    - Regularly monitor memory usage and clear the cache if necessary.

3. No performance improvement observed:

    - Confirm that your workflow is processing repeated or similar text inputs to benefit from caching.
    - Check that the InMemory Embedding Cache node is correctly connected in your workflow.

4. Cache not persisting between sessions:
    - Remember that the InMemory Embedding Cache is cleared when the AnswerAI app is restarted.
    - For persistent caching across restarts, consider implementing a database-backed caching solution.

Remember that the InMemory Embedding Cache is cleared when the AnswerAI app is restarted. For long-term persistence, consider implementing a database-backed caching solution in addition to or instead of the InMemory Embedding Cache.

By leveraging the InMemory Embedding Cache feature, you can significantly enhance the performance and efficiency of your AnswerAI workflows, especially for tasks involving repetitive text processing or embedding-based operations.
