---
description: Cache LLM response in Redis, useful for sharing cache across multiple processes or servers.
---

# Redis Cache

## Overview

The Redis Cache feature in AnswerAI allows you to store Language Model (LLM) responses using Redis, a high-performance, in-memory data store. This caching mechanism is particularly useful for sharing cache across multiple processes or servers, improving response times, and reducing the load on your LLM service.

## Key Benefits

-   Faster response times for repeated queries
-   Reduced API usage, potentially lowering costs
-   Shared cache across multiple processes or servers
-   Scalable and high-performance caching solution
-   Configurable Time to Live (TTL) for cache entries

## How to Use

1.  Set up a Redis server:

    -   Install Redis on your server or use a managed Redis service
    -   Note down the connection details (host, port, username, password)

2.  Configure the Redis Cache credential in AnswerAI:

    -   Navigate to the credentials section in AnswerAI
    -   Create a new credential of type 'redisCacheApi' or 'redisCacheUrlApi'
    -   For 'redisCacheApi', enter the Redis host, port, username, and password
    -   For 'redisCacheUrlApi', enter the Redis connection URL
    -   If using SSL, enable the SSL option
        <!-- TODO: Screenshot of creating Redis Cache credential -->
            <figure><img src="/.gitbook/assets/screenshots/redis cache api credentials.png" alt="" /><figcaption><p>Redis Cache Credentials &#x26; Drop UI</p></figcaption></figure>

3.  Add the Redis Cache node to your AnswerAI workflow:
    <!-- TODO: Screenshot of adding Redis Cache node to the workflow -->
    <figure><img src="/.gitbook/assets/screenshots/redis cache configuration.png" alt="" /><figcaption><p>Redis Cache Configuration &#x26; Drop UI</p></figcaption></figure>

4.  Configure the Redis Cache node:

    -   Connect the previously created credential to the node
    -   (Optional) Set the Time to Live (TTL) in milliseconds
        <!-- TODO: Screenshot showing the configuration of the Redis Cache node -->
        <figure><img src="/.gitbook/assets/screenshots/redis cache api credentials.png" alt="" /><figcaption><p>Redis API Cache Configuration &#x26; Drop UI</p></figcaption></figure>

5.  Connect the Redis Cache node to your LLM node:
      <!-- TODO: Screenshot showing the connection between Redis Cache and LLM nodes -->
    <figure><img src="/.gitbook/assets/screenshots/redis cache in a workflow.png" alt="" /><figcaption><p>Redis API Cache In A workflow &#x26; Drop UI</p></figcaption></figure>

6.  Run your workflow:
    -   The first time a unique prompt is processed, the response will be cached in Redis
    -   Subsequent identical prompts will retrieve the cached response, improving performance

## Tips and Best Practices

1. Optimize cache usage:

    - Use caching for stable, non-dynamic content
    - Ideal for frequently asked questions or standard procedures
    - Avoid caching for time-sensitive or rapidly changing information

2. Configure Time to Live (TTL):

    - Set an appropriate TTL based on how frequently your data changes
    - Shorter TTL for more dynamic content, longer TTL for stable information
    - If TTL is not set, cached entries will persist until manually removed

3. Monitor Redis performance:

    - Regularly check Redis memory usage and performance metrics
    - Implement alerting for Redis server health

4. Secure your Redis instance:

    - Use strong passwords and consider using SSL for encrypted connections
    - Implement proper network security measures to protect your Redis server

5. Scale your Redis setup:

    - For high-traffic applications, consider using Redis clusters or replication
    - Implement proper backup and recovery procedures for your Redis data

6. Handle cache misses gracefully:
    - Implement fallback mechanisms in case of cache misses or Redis connection issues

## Troubleshooting

1. Connection issues:

    - Verify that the Redis server is running and accessible
    - Check if the credential details (host, port, username, password) are correct
    - Ensure that firewalls or network policies allow connections to the Redis server

2. Cache misses or unexpected responses:

    - Verify that the Redis Cache node is correctly connected in your workflow
    - Check if your prompt includes dynamic elements that might prevent proper caching
    - Ensure the TTL is set appropriately for your use case

3. Performance issues:

    - Monitor Redis server load and memory usage
    - Consider upgrading your Redis server or implementing clustering for better performance
    - Optimize your cache key generation if necessary

4. Data consistency issues:

    - If you're using multiple Redis instances, ensure they are properly synchronized
    - Implement proper error handling for scenarios where cached data might be inconsistent

5. SSL connection problems:
    - Verify that SSL is properly configured on both the Redis server and in the AnswerAI credential
    - Check SSL certificate validity and expiration

If you encounter any issues not covered here, refer to the Redis documentation or contact AnswerAI support for assistance.

By leveraging the Redis Cache feature, you can significantly enhance the performance, scalability, and efficiency of your AnswerAI workflows, especially for high-traffic applications or scenarios requiring shared caching across multiple processes or servers.
