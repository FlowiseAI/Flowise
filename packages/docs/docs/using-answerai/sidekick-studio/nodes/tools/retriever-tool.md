---
description: Use a retriever as an allowed tool for agents
---

# Retriever Tool

## Overview

The Retriever Tool node allows you to incorporate a retriever as a tool for agents in AnswerAI workflows. This tool enables agents to search and retrieve relevant documents based on a given query, enhancing their ability to access and utilize information.

## Key Benefits

-   Empowers agents with the ability to search and retrieve relevant information
-   Enhances the knowledge base of agents by providing access to stored documents
-   Allows for flexible configuration of retriever behavior within agent workflows

## How to Use

1. Add the Retriever Tool node to your AnswerAI canvas.
2. Configure the following parameters:

    - Retriever Name: Provide a unique name for the retriever tool (e.g., "search_state_of_union").
    - Retriever Description: Explain when the agent should use this tool to retrieve documents.
    - Retriever: Select the BaseRetriever instance to be used by this tool.
    - Return Source Documents: Choose whether to include source document information in the output.

3. Connect the Retriever Tool node to your agent node or other relevant nodes in your workflow.

<!-- TODO: Add a screenshot showing the Retriever Tool node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/retreivalnode.png" alt="" /><figcaption><p> Retriever Tool node    &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Choose a clear and descriptive name for your retriever tool to make it easily identifiable for the agent.
2. Provide a detailed description of when the agent should use this tool to ensure proper utilization.
3. Consider the trade-offs of returning source documents. While it provides more context, it may increase the response size.
4. Ensure that the selected retriever is properly configured and has access to the relevant document collection.

## Troubleshooting

1. If the agent is not using the retriever tool:

    - Double-check that the tool is properly connected to the agent node.
    - Verify that the tool's description clearly indicates when it should be used.

2. If the retrieved information is not relevant:

    - Review and refine the underlying retriever's configuration.
    - Consider updating the document collection or improving the retrieval method.

3. If you encounter performance issues:
    - Evaluate the size of your document collection and consider optimizing it.
    - Adjust the number of retrieved documents if supported by your retriever.
