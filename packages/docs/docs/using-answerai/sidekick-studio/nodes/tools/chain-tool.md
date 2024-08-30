---
description: Use a chain as an allowed tool for agents
---

# Chain Tool

## Overview

The Chain Tool node allows you to use a chain as an allowed tool for agents in AnswerAI. This feature enables you to incorporate complex chains of operations as tools that agents can utilize, enhancing their capabilities and allowing for more sophisticated workflows.

## Key Benefits

-   Integrate complex chains as tools for agents
-   Customize tool behavior with flexible configuration options
-   Enhance agent capabilities with specialized chains

## How to Use

1. Locate the Chain Tool node in the Tools category of the AnswerAI Studio.
2. Drag and drop the Chain Tool node onto your canvas.
3. Configure the node by providing the following information:
    - Chain Name: Enter a unique name for your chain tool (e.g., "state-of-union-qa").
    - Chain Description: Provide a brief description of what the chain tool does and when it should be used.
    - Return Direct (optional): Toggle this option if you want the tool to return results directly.
    - Base Chain: Connect a compatible Base Chain node to serve as the foundation for your chain tool.

<!-- TODO: Add a screenshot showing the Chain Tool node configuration panel -->
<figure><img src="/.gitbook/assets/screenshots/.png" alt="" /><figcaption><p>Chain Tool node  &#x26; Drop UI</p></figcaption></figure>

4. Connect the Chain Tool node to your agent node or other relevant nodes in your workflow.
5. Save and deploy your workflow to make the chain tool available for use by agents.

## Tips and Best Practices

-   Choose descriptive names and provide clear descriptions for your chain tools to help agents understand when and how to use them effectively.
-   Consider using the "Return Direct" option for chains that produce final results, allowing agents to use the output directly without additional processing.
-   Experiment with different types of chains as tools to expand the capabilities of your agents and create more versatile workflows.
-   Regularly review and update your chain tools to ensure they remain relevant and effective for your agents' tasks.

## Troubleshooting

-   If your chain tool is not being recognized by the agent, double-check that the Chain Name is correctly specified and matches the name used in your agent's configuration.
-   Ensure that the Base Chain connected to the Chain Tool node is compatible and properly configured.
-   If the chain tool is not producing the expected results, review the Chain Description to make sure it accurately represents the tool's functionality.

By utilizing the Chain Tool node in AnswerAI, you can create powerful and flexible agents capable of leveraging complex chains as tools, opening up new possibilities for automation and problem-solving in your workflows.
