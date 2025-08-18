---
description: Load data from real-time search results using SearchAPI
---

# SearchAPI For Web Search

## Overview

The SearchAPI For Web Search feature in AnswerAgentAI allows you to load data from real-time search results across multiple search engines. This powerful tool enables you to incorporate up-to-date information from the web directly into your AnswerAgentAI workflows.

## Key Benefits

-   Access real-time search results from multiple search engines
-   Customize search parameters for precise data retrieval
-   Seamlessly integrate web search data into your AnswerAgentAI projects

## How to Use

1. Connect your SearchAPI credential:

    - Click on the "Connect Credential" option
    - Select or add your SearchAPI credential

2. Configure the search parameters:

    - Enter your search query in the "Query" field
    - (Optional) Add custom parameters in JSON format to fine-tune your search

3. (Optional) Add a Text Splitter:

    - Connect a Text Splitter node to break down large texts into smaller chunks

4. (Optional) Add additional metadata:

    - Input any extra metadata you want to include with your search results

5. (Optional) Omit specific metadata keys:

    - List any metadata keys you want to exclude from the results

6. Run your workflow to retrieve and process the search results

<!-- TODO: Add a screenshot showing the SearchAPI For Web Search node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/searchapi.png" alt="" /><figcaption><p> Search API Node Configuration Node  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Use specific and targeted search queries to get the most relevant results
2. Experiment with custom parameters to refine your search (refer to the [SearchAPI documentation](https://www.searchapi.io/docs/google) for available options)
3. When dealing with large amounts of text, use a Text Splitter to make the content more manageable for further processing
4. Utilize the additional metadata feature to add context or categorization to your search results
5. Use the "Omit Metadata Keys" option to remove any sensitive or unnecessary information from the results

## Troubleshooting

1. If you're not getting any results:

    - Double-check your SearchAPI credential to ensure it's valid
    - Verify that your search query is not too specific or using unsupported syntax
    - Check the SearchAPI documentation to ensure you're using supported parameters

2. If the results are not as expected:

    - Review and adjust your custom parameters
    - Try modifying your search query to be more specific or use different keywords

3. If you're experiencing rate limiting or quota issues:
    - Check your SearchAPI plan limits
    - Consider implementing caching or rate limiting in your workflow to manage API usage

Remember that the quality and relevance of your search results depend on your query and the data available on the web at the time of the search. Always verify the information retrieved for critical applications.
