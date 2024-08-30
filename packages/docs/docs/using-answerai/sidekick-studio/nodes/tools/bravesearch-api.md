---
description: Access Brave search results in real-time with the BraveSearch API Tool
---

# BraveSearch API Tool

## Overview

The BraveSearch API Tool allows you to integrate Brave's search capabilities into your AnswerAI workflows. This tool provides real-time access to Brave search results, enabling you to retrieve up-to-date information on various topics directly within your projects.

## Key Benefits

-   Access to current and relevant search results from Brave
-   Easy integration with AnswerAI workflows
-   Real-time information retrieval for enhanced decision-making

## How to Use

1. Add the BraveSearch API Tool to your canvas in the AnswerAI Studio.

<!-- TODO: Screenshot of adding BraveSearch API Tool to the canvas -->
<figure><img src="/.gitbook/assets/screenshots/braveapi.png" alt="" /><figcaption><p>BraveSearch API Tool  &#x26; Drop UI</p></figcaption></figure>

2. Connect your Brave Search API credential:
    - Click on the BraveSearch API Tool node
    - In the right sidebar, click on "Add New Credential"
    - Select "BraveSearch API" from the dropdown
    - Enter your Brave Search API key
    - Click "Save" to store your credential

<!-- TODO: Screenshot of adding BraveSearch API credential -->
<figure><img src="/.gitbook/assets/screenshots/bravesearchapi.png" alt="" /><figcaption><p>BraveSearch API Credentials  &#x26; Drop UI</p></figcaption></figure>

3. The BraveSearch API Tool is now ready to use in your workflow. You can connect it to other nodes that require search functionality or real-time information.

4. To use the tool in your workflow, simply pass a search query as input to the BraveSearch API Tool node. The tool will return search results in JSON format.

## Tips and Best Practices

1. Use specific and targeted search queries to get the most relevant results.
2. Consider combining the BraveSearch API Tool with other nodes to process and analyze the search results further.
3. Be mindful of API usage limits and implement appropriate error handling in your workflows.

## Troubleshooting

1. **API Key Issues**: If you encounter authentication errors, double-check that you've entered the correct Brave Search API key in your credential settings.

2. **No Results**: If your search query returns no results, try broadening your search terms or check if the topic is too recent or obscure.

3. **Rate Limiting**: If you experience rate limiting issues, consider implementing a delay between requests or optimizing your workflow to reduce the number of API calls.

Remember that the BraveSearch API Tool is particularly useful for retrieving current information and can be a valuable asset in workflows that require up-to-date data from the web.
