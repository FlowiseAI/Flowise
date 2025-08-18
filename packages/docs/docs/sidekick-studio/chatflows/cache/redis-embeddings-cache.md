---
description: Cache generated Embeddings in Redis to improve performance and efficiency
---

# Redis Embeddings Cache

## Overview

The Redis Embeddings Cache feature in AnswerAgentAI allows you to store generated embeddings in Redis, a high-performance, in-memory data store. This caching mechanism improves performance by avoiding the need to recompute embeddings for previously processed text, leading to faster response times and reduced computational overhead.

## Key Benefits

-   Faster processing of repeated or similar text inputs
-   Reduced computational resource usage
-   Improved overall system efficiency and response time
-   Shared cache across multiple processes or servers
-   Configurable Time to Live (TTL) for cache entries

## How to Use

1. Set up a Redis server:

    - Install Redis on your server or use a managed Redis service
    - Note down the connection details (host, port, username, password)

2. Configure the Redis Cache credential in AnswerAgentAI:

    - Navigate to the credentials section in AnswerAgentAI
    - Create a new credential of type 'redisCacheApi' or 'redisCacheUrlApi'
    - For 'redisCacheApi', enter the Redis host, port, username, and password
    - For 'redisCacheUrlApi', enter the Redis connection URL
    - If using SSL, enable the SSL option
        <figure><img src="/.gitbook/assets/screenshots/redis cache api credentials.png" alt="" /><figcaption><p>Redis Cache API Configuration &#x26; Drop UI</p></figcaption></figure> <!-- TODO: Screenshot of creating Redis Cache credential -->

3. Add the Redis Embeddings Cache node to your AnswerAgentAI workflow:
    <!-- TODO: Screenshot of adding Redis Embeddings Cache node to the workflow -->
    <figure><img src="/.gitbook/assets/screenshots/redis embedding cache configuration.png" alt="" /><figcaption><p>Redis Embedding Cache Node &#x26; Drop UI</p></figcaption></figure>  <!-- TODO: Screenshot of creating Redis Cache credential -->

4. Configure the Redis Embeddings Cache node:

    - Connect an Embeddings node to the "Embeddings" input
    - Connect the previously created Redis credential to the node
    - (Optional) Set the Time to Live (TTL) in seconds (default is 3600 seconds or 1 hour)
    - (Optional) Specify a namespace for the cache
        <!-- TODO: Screenshot showing the configuration of the Redis Embeddings Cache node -->

5. Connect the Redis Embeddings Cache node to other nodes in your workflow that require embeddings:
      <!-- TODO: Screenshot showing the connection between Redis Embeddings Cache and other relevant nodes -->
    <figure><img src="/.gitbook/assets/screenshots/redis embedding cache in a workflow.png" alt="" /><figcaption><p>Redis Embedding Cache Node In A Workflow &#x26; Drop UI</p></figcaption></figure>

6. Run your workflow:
    - The first time a unique text is processed, its embedding will be computed and cached in Redis
    - Subsequent identical or similar texts will retrieve the cached embedding, improving performance

## Tips and Best Practices

1. Optimize cache usage:

    - Use caching for repetitive or similar text inputs
    - Ideal for processing documents with recurring phrases or concepts
    - Effective for chatbots or Q&A systems with frequently asked questions

2. Configure Time to Live (TTL):

    - Set an appropriate TTL based on how frequently your data changes
    - Shorter TTL for more dynamic content, longer TTL for stable information
    - The default TTL is 1 hour (3600 seconds)

3. Use namespaces:

    - Implement namespaces to organize embeddings for different purposes or datasets
    - This can help manage cache entries and prevent conflicts between different parts of your application

4. Monitor Redis performance:

    - Regularly check Redis memory usage and performance metrics
    - Implement alerting for Redis server health

5. Secure your Redis instance:

    - Use strong passwords and consider using SSL for encrypted connections
    - Implement proper network security measures to protect your Redis server

6. Scale your Redis setup:

    - For high-traffic applications, consider using Redis clusters or replication
    - Implement proper backup and recovery procedures for your Redis data

7. Combine with other caching strategies:
    - Use Redis Embeddings Cache alongside other caching mechanisms for optimal performance

## Troubleshooting

1. Connection issues:

    - Verify that the Redis server is running and accessible
    - Check if the credential details (host, port, username, password) are correct
    - Ensure that firewalls or network policies allow connections to the Redis server

2. Cache misses or unexpected results:

    - Verify that the Redis Embeddings Cache node is correctly connected in your workflow
    - Check if your input text includes dynamic elements that might prevent proper caching
    - Ensure the TTL is set appropriately for your use case

3. Performance issues:

    - Monitor Redis server load and memory usage
    - Consider upgrading your Redis server or implementing clustering for better performance
    - Optimize your cache key generation if necessary

4. Namespace conflicts:

    - If you're using multiple workflows or applications with the same Redis instance, ensure you're using unique namespaces to avoid conflicts

5. SSL connection problems:

    - Verify that SSL is properly configured on both the Redis server and in the AnswerAgentAI credential
    - Check SSL certificate validity and expiration

6. Unexpected cache evictions:
    - If embeddings are being evicted from the cache too quickly, consider increasing the TTL or Redis memory allocation

Remember that the Redis Embeddings Cache is cleared based on the TTL you set (default 1 hour). For long-term persistence, consider implementing a database-backed caching solution in addition to or instead of the Redis Embeddings Cache.

By leveraging the Redis Embeddings Cache feature, you can significantly enhance the performance and efficiency of your AnswerAgentAI workflows, especially for tasks involving repetitive text processing or embedding-based operations across multiple processes or servers.
