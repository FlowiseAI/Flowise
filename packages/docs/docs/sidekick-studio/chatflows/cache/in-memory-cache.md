---
description: Cache LLM responses in local memory for improved performance
---

# InMemory Cache

## Overview

The InMemory Cache feature in AnswerAgentAI allows you to store Language Model (LLM) responses in local memory. This caching mechanism improves performance by reducing the need for repeated API calls for identical prompts.

## Key Benefits

-   Faster response times for repeated queries
-   Reduced API usage, potentially lowering costs
-   Improved overall system efficiency

## How to Use

1. Add the InMemory Cache node to your AnswerAgentAI workflow:
       <!-- TODO: Screenshot of adding InMemory Cache node to the workflow -->
    <figure><img src="/.gitbook/assets/screenshots/inmemorycache.png" alt="" /><figcaption><p>In Memory Cache &#x26; Drop UI</p></figcaption></figure>

2. Connect the InMemory Cache node to your LLM node:
       <!-- TODO: Screenshot showing the connection between InMemory Cache and LLM nodes -->
    <figure><img src="/.gitbook/assets/screenshots/in memory cache in a workflow.png" alt="" /><figcaption><p>Tool Agent &#x26; Drop UI</p></figcaption></figure>
3. Configure your workflow to use the cache:

    - No additional configuration is required. The cache will automatically store and retrieve responses.

4. Run your workflow:
    - The first time a unique prompt is processed, the response will be cached.
    - Subsequent identical prompts will retrieve the cached response, improving performance.

## Tips and Best Practices

1. Use caching for stable, non-dynamic content:

    - Ideal for frequently asked questions or standard procedures.
    - Avoid caching for time-sensitive or rapidly changing information.

2. Monitor cache usage:

    - Regularly review which prompts are being cached to ensure relevance.
    - Consider clearing the cache periodically if information becomes outdated.

3. Combine with other caching strategies:

    - For more persistent caching, consider using the InMemory Cache alongside database caching solutions.

4. Test thoroughly:
    - Ensure that caching doesn't negatively impact the accuracy or relevance of your AI responses.

## Troubleshooting

1. Cached responses seem outdated:

    - Remember that the InMemory Cache is cleared when the AnswerAgentAI app is restarted.
    - If you need to update cached responses, restart the application or implement a cache clearing mechanism.

2. No performance improvement observed:

    - Verify that the InMemory Cache node is correctly connected in your workflow.
    - Ensure that you're testing with repeated, identical prompts to see the caching effect.

3. Unexpected responses:
    - Check if your prompt includes dynamic elements (e.g., timestamps, user-specific data) that might prevent proper caching.
    - Review your workflow to ensure the cache is being used as intended.

Remember that the InMemory Cache is cleared when the AnswerAgentAI app is restarted. For long-term persistence, consider using a database caching solution in addition to or instead of the InMemory Cache.

By leveraging the InMemory Cache feature, you can significantly enhance the performance and efficiency of your AnswerAgentAI workflows, especially for frequently repeated queries or stable information retrieval tasks.
