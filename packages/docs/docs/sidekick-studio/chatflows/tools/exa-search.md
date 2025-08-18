---
description: Exa Search Tool for AnswerAgentAI
---

# Exa Search

## Overview

The Exa Search tool is a powerful search engine wrapper designed specifically for use by Language Models (LLMs) in AnswerAgentAI. It allows you to perform advanced searches and retrieve highly relevant results from the web.

## Key Benefits

-   Optimized for LLM queries, providing more accurate and relevant search results
-   Flexible search options, including keyword, neural, and magic search types
-   Ability to filter results by domains, dates, and categories for more targeted searches

## How to Use

1. Add the Exa Search node to your AnswerAgentAI canvas.
2. Configure the node settings:
    - Tool Description: Customize the description of what the tool does (optional).
    - Number of Results: Specify how many search results to return (default is 10).
    - Search Type: Choose between keyword, neural, or magic search.
    - Use Auto Prompt: Enable to convert your query to an Exa-optimized query automatically.
    - Category: Select a specific data category to focus your search (optional).
    - Include/Exclude Domains: Specify domains to include or exclude from the search results.
    - Date Filters: Set crawl and published date ranges to refine your search.
3. Connect the Exa Search node to your workflow.
4. Run your workflow, and the Exa Search tool will provide search results based on your configuration.

<!-- TODO: Add a screenshot of the Exa Search node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/exasearch.png" alt="" /><figcaption><p> Exa Search node  &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Use the "magic" search type when you're unsure whether keyword or neural search would be more effective.
2. Leverage the category filter to focus on specific types of content, such as company information, research papers, or news articles.
3. Utilize the domain inclusion/exclusion feature to narrow down your search to trusted sources or exclude irrelevant websites.
4. Experiment with different date ranges to find the most up-to-date or historical information as needed.

## Troubleshooting

1. If you're not getting enough results, try increasing the "Number of Results" setting. Note that the maximum is 10 for basic plans, but can be higher for custom plans.
2. If the search results are not relevant, try adjusting the search type or enabling the "Use Auto Prompt" option for better query optimization.
3. Ensure that your Exa Search API key is correctly set up in the AnswerAgentAI credentials manager.

<!-- TODO: Add a screenshot showing where to input the Exa Search API key in the credentials manager -->
<figure><img src="/.gitbook/assets/screenshots/exaapi.png" alt="" /><figcaption><p> Exa Search API  &#x26; Drop UI</p></figcaption></figure>
Remember that the Exa Search tool is designed to work seamlessly with LLMs, making it an excellent choice for AI-driven search tasks in your AnswerAgentAI workflows.
