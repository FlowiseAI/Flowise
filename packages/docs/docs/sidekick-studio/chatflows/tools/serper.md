---
description: Serper - Google Search API Integration
---

# Serper Tools

## Overview

The Serper Tools node in AnswerAgentAI integrates the Serper.dev Google Search API, allowing workflows to perform powerful web searches directly within the AnswerAgentAI Studio. This tool enables agents to access up-to-date information from the internet, enhancing their ability to provide relevant and current responses.

## Key Benefits

-   Access to real-time web search results within AnswerAgentAI workflows
-   Enhance agent capabilities with current and relevant information
-   Seamless integration with Google Search functionality

## How to Use

1. Add the Serper Tools node to your canvas in the AnswerAgentAI Studio.
2. Connect your Serper API credential:
    - Click on the node to open its settings.
    - Under the "Connect Credential" section, select or add your Serper API credentials.

<!-- TODO: Screenshot of the Serper Tools node settings, highlighting the credential connection -->
<figure><img src="/.gitbook/assets/screenshots/serperapi.png" alt="" /><figcaption><p> Serper Tools Node    &#x26; Drop UI</p></figcaption></figure>

3. Configure any additional parameters if required (none are specified in the current version).
4. Connect the Serper Tools node to other nodes in your workflow where web search functionality is needed.

## Tips and Best Practices

-   Use Serper Tools when your agents need access to current information that may not be present in their training data.
-   Combine Serper Tools with other nodes to create more informed and up-to-date responses.
-   Be mindful of API usage and costs associated with the Serper.dev service.

## Troubleshooting

-   If the node fails to initialize, ensure that your Serper API credential is correctly set up and contains a valid API key.
-   Check your Serper.dev account for any API usage limits or restrictions if you encounter unexpected behavior.

<!-- TODO: Screenshot showing where to check API usage in the Serper.dev dashboard -->

Remember that the Serper Tools node acts as a wrapper around the Serper.dev Google Search API. Familiarize yourself with the Serper.dev documentation for more detailed information on the underlying API capabilities and limitations.
