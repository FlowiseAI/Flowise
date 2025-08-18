---
description: Cache LLM responses using Momento, a distributed, serverless cache
---

# Momento Cache

## Overview

The Momento Cache feature in AnswerAgentAI allows you to store Language Model (LLM) responses using Momento, a distributed, serverless cache. This caching mechanism improves performance and reduces costs by storing and retrieving responses for repeated queries, eliminating the need for redundant API calls.

## Key Benefits

-   Faster response times for repeated queries
-   Reduced API usage, potentially lowering costs
-   Scalable, serverless caching solution
-   Distributed cache for improved reliability and performance

## How to Use

1. Set up a Momento account and obtain your API key:

    - Sign up for a Momento account at [https://gomomento.com/](https://gomomento.com/)
    - Create a new cache and note down the cache name
    - Generate an API key for authentication

2. Configure the Momento Cache credential in AnswerAgentAI:

    - Navigate to the credentials section in AnswerAgentAI
    - Create a new credential of type 'momentoCacheApi'
    - Enter your Momento API key and cache name
        <figure><img src="/.gitbook/assets/screenshots/momento cache api credentials.png" alt="" /><figcaption><p>Momento Cache Node &#x26; Drop UI</p></figcaption></figure><!-- TODO: Screenshot of creating Momento Cache credential -->

3. Add the Momento Cache node to your AnswerAgentAI workflow:
    <!-- TODO: Screenshot of adding Momento Cache node to the workflow -->
    <figure><img src="/.gitbook/assets/screenshots/momento cache configuration.png" alt="" /><figcaption><p>Momento  Cache Node Configuration &#x26; Drop UI</p></figcaption></figure>

4. Configure the Momento Cache node:

    - Connect the previously created credential to the node
        <!-- TODO: Screenshot showing the configuration of the Momento Cache node -->

5. Connect the Momento Cache node to your LLM node:
     <!-- TODO: Screenshot showing the connection between Momento Cache and LLM nodes -->
    <figure><img src="/.gitbook/assets/screenshots/momento cache in  a workflow.png" alt="" /><figcaption><p>Momento  Cache Node In A Workflow &#x26; Drop UI</p></figcaption></figure>

6. Run your workflow:
    - The first time a unique prompt is processed, the response will be cached in Momento
    - Subsequent identical prompts will retrieve the cached response, improving performance

## Tips and Best Practices

1. Optimize cache usage:

    - Use caching for stable, non-dynamic content
    - Ideal for frequently asked questions or standard procedures
    - Avoid caching for time-sensitive or rapidly changing information

2. Monitor cache performance:

    - Regularly review cache hit rates and response times
    - Adjust cache settings (e.g., TTL) based on your specific use case

3. Secure your API key:

    - Keep your Momento API key confidential
    - Use environment variables or secure credential management systems

4. Implement error handling:

    - Add appropriate error handling in your workflow to manage potential cache connection issues

5. Consider data privacy:
    - Ensure that caching sensitive information complies with your data privacy policies and regulations

## Troubleshooting

1. Cache misses or unexpected responses:

    - Verify that the Momento Cache node is correctly connected in your workflow
    - Check if your prompt includes dynamic elements that might prevent proper caching
    - Ensure the cache name in your credential matches the one in your Momento account

2. Authentication errors:

    - Double-check that your Momento API key is correct and active
    - Verify that the credential is properly linked to the Momento Cache node

3. Performance issues:

    - If you're not seeing expected performance improvements, ensure you're testing with repeated, identical prompts
    - Check your Momento account dashboard for any service issues or limits

4. Cached data persistence:
    - Remember that Momento Cache has a default TTL (Time To Live) of 24 hours
    - Adjust the TTL in your workflow if you need longer or shorter cache persistence

If you encounter any issues not covered here, refer to the Momento documentation or contact AnswerAgentAI support for assistance.

By leveraging the Momento Cache feature, you can significantly enhance the performance, efficiency, and scalability of your AnswerAgentAI workflows, especially for frequently repeated queries or stable information retrieval tasks.
