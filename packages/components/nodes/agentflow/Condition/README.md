# Condition

Split flows based on If/Else conditions.

## Parameters

| Parameter  | Description                                          | Type  | Required |
| ---------- | ---------------------------------------------------- | ----- | -------- |
| Conditions | Array of conditions to evaluate (value1, op, value2) | Array | Yes      |

## Supported Types

| Type    | Operations                                                                             |
| ------- | -------------------------------------------------------------------------------------- |
| String  | Contains, Not Contains, Ends With, Equal, Not Equal, Starts With, Regex, Is Empty, Not Empty |
| Number  | Smaller, Smaller Equal, Equal, Not Equal, Larger, Larger Equal, Is Empty, Not Empty    |
| Boolean | Equal, Not Equal                                                                       |

## Outputs

The node produces multiple outputs. When a condition is met the flow continues through the matching output. If no condition is fulfilled, the flow follows the **Else** output.

## License

Source code in this repository is made available under the [Apache License Version 2.0](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md).
