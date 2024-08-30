---
description: Set and Get Variable Nodes for Dynamic Data Management
---

# Set and Get Variable Nodes

## Overview

The Set Variable and Get Variable nodes are powerful utility tools in AnswerAI that allow you to store and retrieve data dynamically within your workflows. These nodes are essential for managing information across different parts of your flow, enabling you to save computation time and create more efficient workflows.

## Key Benefits

-   Reuse data across different parts of your workflow without recomputation
-   Improve workflow efficiency and reduce redundant operations
-   Easily manage and access dynamic data throughout your flow

## How to Use

### Set Variable Node

The Set Variable node allows you to store data under a specific variable name for later use.

1. Add a Set Variable node to your canvas.
2. Connect the output of any node that produces data (string, number, boolean, JSON, or array) to the Set Variable node's input.
3. In the node settings:
    - Enter a unique "Variable Name" (e.g., "myData").
    - The "Input" field will automatically populate with the connected data.

<!-- TODO: Screenshot of Set Variable node configuration -->
<figure><img src="/.gitbook/assets/screenshots/setvariable.png" alt="" /><figcaption><p> Set Variable Node   &#x26; Drop UI</p></figcaption></figure>
### Get Variable Node

The Get Variable node allows you to retrieve previously stored data using the variable name.

1. Add a Get Variable node to your canvas where you need to use the stored data.
2. In the node settings:
    - Enter the "Variable Name" that matches the one used in the Set Variable node (e.g., "myData").
3. Connect the Get Variable node's output to any node that requires this data as input.

<!-- TODO: Screenshot of Get Variable node configuration -->
<figure><img src="/.gitbook/assets/screenshots/getvariable.png" alt="" /><figcaption><p> Get Variable Node   &#x26; Drop UI</p></figcaption></figure>
## Tips and Best Practices

1. Use descriptive variable names to easily identify the stored data (e.g., "userInput" or "apiResponse").
2. Ensure that variable names are unique within your workflow to avoid conflicts.
3. Use Set Variable nodes strategically to store results from computationally expensive operations or API calls.
4. Remember that variables are only available during the runtime of your workflow and do not persist between different runs.

## Troubleshooting

1. If a Get Variable node returns undefined:

    - Check if the variable name matches exactly with the one used in the Set Variable node.
    - Ensure that the Set Variable node is executed before the Get Variable node in your workflow.

2. If you're not seeing the expected data type in the Get Variable node output:
    - Verify the data type being stored in the Set Variable node.
    - Check if any transformations are applied to the data between setting and getting the variable.

By effectively using the Set and Get Variable nodes, you can create more dynamic and efficient workflows in AnswerAI, allowing for better data management and reusability across your chatbot or application logic.
