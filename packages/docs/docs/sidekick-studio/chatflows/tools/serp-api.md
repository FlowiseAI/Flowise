---
description: SERP API Tool Node Documentation
---

# SERP API Tool Node

## Overview

The SERP API Tool Node allows you to integrate Google search results into your AnswerAgentAI workflows. It provides access to real-time Google search data, enabling your agents to retrieve up-to-date information from the web.

## Key Benefits

-   Access to real-time Google search results
-   Retrieve various types of search data (web results, images, news, etc.)
-   Customize search parameters for specific use cases

## How to Use

1. Add the SERP API Tool Node to your AnswerAgentAI workflow canvas.
2. Connect your SERP API credential to the node.
3. Configure the search parameters as needed for your use case.
4. Connect the SERP API Tool Node to other nodes in your workflow to process the search results.

## Parameters

The SERP API Tool Node accepts the following parameters:

1. `q` (required): The search query string.

2. `location`: The location from which you want the search to originate.

3. `device`: The device to use for results. Options: `desktop` (default), `tablet`, or `mobile`.

4. `google_domain`: The Google domain to use (e.g., `google.com`, `google.co.uk`).

5. `gl`: The country code for the search (e.g., `us` for United States, `uk` for United Kingdom).

6. `hl`: The language code for the search results (e.g., `en` for English, `es` for Spanish).

7. `num`: The number of results to return (default is 10).

8. `start`: The result offset for pagination (e.g., 0 for first page, 10 for second page).

9. `safe`: Safe search setting. Options: `active` or `off` (default).

10. `tbm`: The type of search to perform. Options include:

    - (empty): Regular Google Search
    - `isch`: Google Images
    - `lcl`: Google Local
    - `vid`: Google Videos
    - `nws`: Google News
    - `shop`: Google Shopping

11. `tbs`: Advanced search parameters (e.g., for date ranges, file types).

12. `no_cache`: Set to `true` to bypass cached results (default is `false`).

13. `lr`: Limit results to specific languages.

14. `filter`: Enable (`1`) or disable (`0`) duplicate content filter.

15. `as_sitesearch`: Limit results to a specific website.

16. `as_qdr`: Filter results by date (e.g., `d` for past 24 hours, `w` for past week).

17. `as_rights`: Filter results by usage rights.

18. `sort`: Sort results (e.g., by date for news searches).

## Tips and Best Practices

1. Use specific and targeted search queries for better results.
2. Combine the SERP API Tool with other nodes to process and analyze the search results.
3. Be mindful of your API usage to avoid exceeding rate limits.
4. Use the `location` parameter to get region-specific results when relevant.
5. Experiment with different search types (`tbm` parameter) for various use cases.

## Troubleshooting

1. If you're not getting results, check that your SERP API credential is correctly configured.
2. Ensure that your search query is properly formatted and encoded.
3. If you're hitting rate limits, consider implementing caching or reducing the frequency of requests.

<!-- TODO: Add a screenshot of the SERP API Tool Node configuration in the AnswerAgentAI canvas -->
<figure><img src="/.gitbook/assets/screenshots/serperapi.png" alt="" /><figcaption><p> SERP API Tool  node    &#x26; Drop UI</p></figcaption></figure>

By configuring these parameters, you can customize the SERP API Tool Node to retrieve the most relevant search results for your AnswerAgentAI workflows.
