---
description: Learn how to build multi-agents system using Agentflow V2 for more powerful agents that can handle complex tasks over long periods of time
---

# Agent Flows V2

This guide explores the AgentFlow V2 architecture, detailing its core concepts, use cases, Flow State, and comprehensive node references.

:::warning
**Disclaimer:** This documentation describes AgentFlow V2 as of its current official release. Features, functionalities, and node parameters are subject to change in future updates and versions of AnswerAgent/Flowise. Please refer to the latest official release notes or in-app information for the most up-to-date details.
:::

## Core Concept

AgentFlow V2 represents a significant architectural evolution, introducing a new paradigm in AnswerAgent/Flowise that focuses on explicit workflow orchestration and enhanced flexibility. Unlike V1's primary reliance on external frameworks for its core agent graph logic, V2 shifts the focus towards designing the entire workflow using a granular set of specialized, standalone nodes developed natively as core AnswerAgent/Flowise components.

In this V2 architecture, each node functions as an independent unit, executing a discrete operation based on its specific design and configuration. The visual connections between nodes on the canvas explicitly define the workflow's path and control sequence, data can be passed between nodes by referencing the outputs of any previously executed node in the current flow, and the Flow State provides an explicit mechanism for managing and sharing data throughout the workflow.

V2 architecture implements a comprehensive node-dependency and execution queue system that precisely respects these defined pathways while maintaining clear separation between components, allowing workflows to become both more sophisticated and easier to design. This allow complex patterns like loops, conditional branching, human-in-the-loop interactions and others to be achievable. This makes it more adaptable to diverse use cases while remaining more maintainable and extensible.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-1-flow-types.png" alt="AgentFlow V2 Flow Types" /><figcaption></figcaption></figure>

## Difference between Agentflow and Automation Platform

One of the most asked question: What is the difference between Agentflow and automation platforms like n8n, Make, or Zapier?

### 💬 **Agent-to-agent Communication**

Multimodal communication between agents is supported. A Supervisor agent can formulate and delegate tasks to multiple Worker agents, with outputs from the Worker agents subsequently returned to the Supervisor.

At each step, agents have access to the complete conversation history, enabling the Supervisor to determine the next task and the Worker agents to interpret the task, select appropriate tools, and execute actions accordingly.

This architecture enables **collaboration, delegation, and shared task management** across multiple agents, such capabilities are not typically offered by traditional automation tools.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-2-a2a.png" alt="Agent-to-Agent Communication" /><figcaption></figcaption></figure>

### 🙋‍♂ Human-in-the-loop

Execution is paused while awaiting human input, without blocking the running thread. Each checkpoint is saved, allowing the workflow to resume from the same point even after an application restart.

The use of checkpoints enables **long-running, stateful agents**.

Agents can also be configured to **request permission before executing tools**, similar to how Claude asks for user approval before using MCP tools. This helps prevent the autonomous execution of sensitive actions without explicit user approval.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-3-feedback.png" alt="Human-in-the-Loop Feedback" /><figcaption></figcaption></figure>

### 📖 Shared State

Shared state enables data exchange between agents, especially useful for passing data across branches or non-adjacent steps in a flow. Refer to [Understanding Flow State](#understanding-flow-state)

### ⚡ Streaming

Supports Server-Sent Events (SSE) for real-time streaming of LLM or agent responses. Streaming also enables subscription to execution updates as the workflow progresses.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-4-streaming.png" alt="Streaming Support" /><figcaption></figcaption></figure>

### 🌐 MCP Tools

While traditional automation platforms often feature extensive libraries of pre-built integrations, Agentflow allows MCP ([Model Context Protocol](https://github.com/modelcontextprotocol)) tools to be connected as part of the workflow, rather than functioning solely as agent tools.

Custom MCPs can also be created independently, without depending on platform-provided integrations. MCP is widely considered an industry standard and is typically supported and maintained by the official providers. For example, the GitHub MCP is developed and maintained by the GitHub team, with similar support provided for Atlassian Jira, Brave Search, and others.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-5-mcp-tools.png" alt="MCP Tools Integration" /><figcaption></figcaption></figure>

## Agentflow V2 Node Reference

This section provides a detailed reference for each available node, outlining its specific purpose, key configuration parameters, expected inputs, generated outputs, and its role within the AgentFlow V2 architecture.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-6-node-ref.png" alt="AgentFlow V2 Node Reference" /><figcaption></figcaption></figure>

---

### **1. Start Node**

The designated entry point for initiating any AgentFlow V2 workflow execution. Every flow must begin with this node.

-   **Functionality:** Defines how the workflow is triggered and sets up the initial conditions. It can accept input either directly from the chat interface or through a customizable form presented to the user. It also allows for the initialization of `Flow State` variables at the beginning of the execution and can manage how conversation memory is handled for the run.
-   **Configuration Parameters**
    -   **Input Type**: Determines how the workflow execution is initiated, either by `Chat Input` from the user or via a submitted `Form Input`.
        -   **Form Title, Form Description, Form Input Types**: If `Form Input` is selected, these fields configure the appearance of the form presented to the user, allowing for various input field types with defined labels and variable names.
    -   **Ephemeral Memory**: If enabled, instructs the workflow to begin the execution without considering any past messages from the conversation thread, effectively starting with a clean memory slate.
    -   **Flow State**: Defines the complete set of initial key-value pairs for the workflow's runtime state `$flow.state`. All state keys that will be used or updated by subsequent nodes must be declared and initialized here.
-   **Inputs:** Receives the initial data that triggers the workflow, which will be either a chat message or the data submitted through a form.
-   **Outputs:** Provides a single output anchor to connect to the first operational node, passing along the initial input data and the initialized Flow State.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-7-start.png" alt="Start Node" width="343" /><figcaption></figcaption></figure>

---

### **2. LLM Node**

Provides direct access to a configured Large Language Model (LLM) for executing AI tasks, enabling the workflow to perform structured data extraction if needed.

-   **Functionality:** This node sends requests to an LLM based on provided instructions (Messages) and context. It can be used for text generation, summarization, translation, analysis, answering questions, and generating structured JSON output according to a defined schema. It has access to memory for the conversation thread and can read/write to the `Flow State`.
-   **Configuration Parameters**
    -   **Model**: Specifies the AI model from a chosen service — e.g., OpenAI's GPT-4o or Google Gemini.
    -   **Messages**: Define the conversational input for the LLM, structuring it as a sequence of roles — System, User, Assistant, Developer — to guide the AI's response. Dynamic data can be inserted using `{{ variable }}`.
    -   **Memory**: If enabled, determines if the LLM should consider the history of the current conversation thread when generating its response.
        -   **Memory Type, Window Size, Max Token Limit**: If memory is used, these settings refine how the conversation history is managed and presented to the LLM — for example, whether to include all messages, only a recent window of turns, or a summarized version.
        -   **Input Message**: Specifies the variable or text that will be appended as the most recent user message at the end of the existing conversation context — including initial context and memory — before being processed by the LLM/Agent.
    -   **Return Response As**: Configures how the LLM's output is categorized — as a `User Message` or `Assistant Message` — which can influence how it's handled by subsequent memory systems or logging.
    -   **JSON Structured Output**: Instructs the LLM to format its output according to a specific JSON schema — including keys, data types, and descriptions — ensuring predictable, machine-readable data.
    -   **Update Flow State**: Allows the node to modify the workflow's runtime state `$flow.state` during execution by updating pre-defined keys. This makes it possible, for example, to store this LLM node's output under such a key, making it accessible to subsequent nodes.
-   **Inputs:** This node utilizes data from the workflow's initial trigger or from the outputs of preceding nodes, incorporating this data into the `Messages` or `Input Message` fields. It can also retrieve values from `$flow.state` when input variables reference it.
-   **Outputs:** Produces the LLM's response, which will be either plain text or a structured JSON object. The categorization of this output — as User or Assistant — is determined by the `Return Response` setting.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-8-llm.png" alt="LLM Node" width="375" /><figcaption></figcaption></figure>

---

### **3. Agent Node**

Represents an autonomous AI entity capable of reasoning, planning, and interacting with tools or knowledge sources to accomplish a given objective.

-   **Functionality:** This node uses an LLM to dynamically decide a sequence of actions. Based on the user's goal — provided via messages/input — it can choose to use available Tools or query Document Stores to gather information or perform actions. It manages its own reasoning cycle and can utilize memory for the conversation thread and `Flow State`. Suitable for tasks requiring multi-step reasoning or interacting dynamically with external systems or tools.
-   **Configuration Parameters**
    -   **Model**: Specifies the AI model from a chosen service — e.g., OpenAI's GPT-4o or Google Gemini — that will drive the agent's reasoning and decision-making processes.
    -   **Messages**: Define the initial conversational input, objective, or context for the agent, structuring it as a sequence of roles — System, User, Assistant, Developer — to guide the agent's understanding and subsequent actions. Dynamic data can be inserted using `{{ variable }}`.
    -   **Tools**: Specify which pre-defined AnswerAgent/Flowise Tools the agent is authorized to use to achieve its goals.
        -   For each selected tool, an optional **Require Human Input flag** indicates if the tool's operation might itself pause to ask for human intervention.
    -   **Knowledge / Document Stores**: Configure access to information within AnswerAgent/Flowise-managed Document Stores.
        -   **Document Store**: Choose a pre-configured Document Store from which the agent can retrieve information. These stores must be set up and populated in advance.
        -   **Describe Knowledge**: Provide a natural language description of the content and purpose of this Document Store. This description guides the agent in understanding what kind of information the store contains and when it would be appropriate to query it.
    -   **Knowledge / Vector Embeddings**: Configure access to external, pre-existing vector stores as additional knowledge sources for the agent.
        -   **Vector Store**: Selects the specific, pre-configured vector database the agent can query.
        -   **Embedding Model**: Specifies the embedding model associated with the selected vector store, ensuring compatibility for queries.
        -   **Knowledge Name**: Assigns a short, descriptive name to this vector-based knowledge source, which the agent can use for reference.
        -   **Describe Knowledge**: Provide a natural language description of the content and purpose of this vector store, guiding the agent on when and how to utilize this specific knowledge source.
        -   **Return Source Documents**: If enabled, instructs the agent to include source document information with the data retrieved from the vector store.
    -   **Memory**: If enabled, determines if the agent should consider the history of the current conversation thread when making decisions and generating responses.
        -   **Memory Type, Window Size, Max Token Limit**: If memory is used, these settings refine how the conversation history is managed and presented to the agent — for example, whether to include all messages, only a recent window of turns, or a summarized version.
        -   **Input Message**: Specifies the variable or text that will be appended as the most recent user message at the end of the existing conversation context — including initial context and memory — before being processed by the LLM/Agent.
    -   **Return Response**: Configures how the agent's final output or message is categorized — as a User Message or Assistant Message — which can influence how it's handled by subsequent memory systems or logging.
    -   **Update Flow State**: Allows the node to modify the workflow's runtime state `$flow.state` during execution by updating pre-defined keys. This makes it possible, for example, to store this Agent node's output under such a key, making it accessible to subsequent nodes.
-   **Inputs:** This node utilizes data from the workflow's initial trigger or from the outputs of preceding nodes, often incorporated into the `Messages` or `Input Message` fields. It accesses the configured tools and knowledge sources as needed.
-   **Outputs:** Produces the final result or response generated by the agent after it has completed its reasoning, planning, and any interactions with tools or knowledge sources.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-9-agent.png" alt="Agent Node" width="375" /><figcaption></figcaption></figure>

---

### **4. Tool Node**

Provides a mechanism for directly and deterministically executing a specific, pre-defined AnswerAgent/Flowise Tool within the workflow sequence. Unlike the Agent node, where the LLM dynamically chooses a tool based on reasoning, the Tool node executes exactly the tool selected by the workflow designer during configuration.

-   **Functionality:** This node is used when the workflow requires the execution of a known, specific capability at a defined point, with readily available inputs. It ensures deterministic action without involving LLM reasoning for tool selection.
-   **How it Works**
    1. **Triggering:** When the workflow execution reaches a Tool node, it activates.
    2. **Tool Identification:** It identifies the specific AnswerAgent/Flowise Tool selected in its configuration.
    3. **Input Argument Resolution:** It looks at the Tool Input Arguments configuration. For each required input parameter of the selected tool.
    4. **Execution:** It invokes the underlying code or API call associated with the selected AnswerAgent/Flowise Tool, passing the resolved input arguments.
    5. **Output Generation:** It receives the result returned by the tool's execution.
    6. **Output Propagation:** It makes this result available via its output anchor for subsequent nodes to use.
-   **Configuration Parameters**
    -   **Tool Selection**: Choose the specific, registered AnswerAgent/Flowise Tool that this node will execute from a dropdown list.
    -   **Input Arguments**: Define how data from your workflow is supplied to the selected tool. This section dynamically adapts based on the chosen tool, presenting its specific required input parameters:
        -   **Map Argument Name**: For each input the selected tool requires (e.g., `input` for a Calculator), this field will show the expected parameter name as defined by the tool itself.
        -   **Provide Argument Value**: Set the value for that corresponding parameter, using a dynamic variable like `{{ previousNode.output }}`, `{{ $flow.state.someKey }}`, or by entering static text.
    -   **Update Flow State**: Allows the node to modify the workflow's runtime state `$flow.state` during execution by updating pre-defined keys. This makes it possible, for example, to store this Tool node's output under such a key, making it accessible to subsequent nodes.
-   **Inputs:** Receives necessary data for the tool's arguments via the `Input Arguments` mapping, sourcing values from previous node outputs, `$flow.state`, or static configurations.
-   **Outputs:** Produces the raw output generated by the executed tool — e.g., a JSON string from an API, a text result, or a numerical value.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-10-tool.png" alt="Tool Node" width="375" /><figcaption></figcaption></figure>

---

### **5. Retriever Node**

Performs targeted information retrieval from configured Document Stores.

-   **Functionality:** This node queries one or more specified Document Stores, fetching relevant document chunks based on semantic similarity. It's a focused alternative to using an Agent node when the only required action is retrieval and dynamic tool selection by an LLM is not necessary.
-   **Configuration Parameters**
    -   **Knowledge / Document Stores**: Specify which pre-configured and populated Document Store(s) this node should query to find relevant information.
    -   **Retriever Query**: Define the text query that will be used to search the selected Document Stores. Dynamic data can be inserted using `{{ variables }}`.
    -   **Output Format**: Choose how the retrieved information should be presented — either as plain `Text` or as `Text with Metadata`, which might include details like source document names or locations.
    -   **Update Flow State**: Allows the node to modify the workflow's runtime state `$flow.state` during execution by updating pre-defined keys. This makes it possible, for example, to store this Retriever node's output under such a key, making it accessible to subsequent nodes.
-   **Inputs:** Requires a query string — often supplied as a variable from a previous step or user input — and accesses the selected Document Stores for information.
-   **Outputs:** Produces the document chunks retrieved from the knowledge base, formatted according to the chosen `Output Format`.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-11-retriever.png" alt="Retriever Node" width="375" /><figcaption></figcaption></figure>

---

### 6. HTTP Node

Facilitates direct communication with external web services and APIs via the Hypertext Transfer Protocol (HTTP).

-   **Functionality:** This node enables the workflow to interact with any external system accessible via HTTP. It can send various types of requests (GET, POST, PUT, DELETE, PATCH) to a specified URL, allowing for integration with third-party APIs, fetching data from web resources, or triggering external webhooks. The node supports configuration of authentication methods, custom headers, query parameters, and different request body types to accommodate diverse API requirements.
-   **Configuration Parameters**
    -   **HTTP Credential**: Optionally select pre-configured credentials — such as Basic Auth, Bearer Token, or API Key — to authenticate requests to the target service.
    -   **Request Method**: Specify the HTTP method to be used for the request — e.g., `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.
    -   **Target URL**: Define the complete URL of the external endpoint to which the request will be sent.
    -   **Request Headers**: Set any necessary HTTP headers as key-value pairs to be included in the request.
    -   **URL Query Parameters**: Define key-value pairs that will be appended to the URL as query parameters.
    -   **Request Body Type**: Choose the format of the request payload if sending data — options include `JSON`, `Raw text`, `Form Data`, or `x-www-form-urlencoded`.
    -   **Request Body**: Provide the actual data payload for methods like POST or PUT. The format should match the selected `Body Type`, and dynamic data can be inserted using `{{ variables }}`.
    -   **Response Type**: Specify how the workflow should interpret the response received from the server — options include `JSON`, `Text`, `Array Buffer`, or `Base64` for binary data.
-   **Inputs:** Receives configuration data such as the URL, method, headers, and body, often incorporating dynamic values from previous workflow steps or `$flow.state`.
-   **Outputs:** Produces the response received from the external server, parsed according to the selected `Response Type`.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-12-http.png" alt="HTTP Node" width="375" /><figcaption></figcaption></figure>

---

### **7. Condition Node**

Implements deterministic branching logic within the workflow based on defined rules.

-   **Functionality:** This node acts as a decision point, evaluating one or more specified conditions to direct the workflow down different paths. It compares input values — which can be strings, numbers, or booleans — using a variety of logical operators, such as equals, contains, greater than, or is empty. Based on whether these conditions evaluate to true or false, the workflow execution proceeds along one of the distinct output branches connected to this node.
-   **Configuration Parameters**
    -   **Conditions**: Configure the set of logical rules the node will evaluate.
        -   **Type**: Specify the type of data being compared for this rule — `String`, `Number`, or `Boolean`.
        -   **Value 1**: Define the first value for the comparison. Dynamic data can be inserted using `{{ variables }}`.
        -   **Operation**: Select the logical operator to apply between Value 1 and Value 2 — e.g., `equal`, `notEqual`, `contains`, `larger`, `isEmpty`.
        -   **Value 2**: Define the second value for the comparison, if required by the chosen operation. Dynamic data can also be inserted here using `{{ variables }}`.
-   **Inputs:** Requires the data for `Value 1` and `Value 2` for each condition being evaluated. These values are supplied from previous node outputs or retrieved from `$flow.state`.
-   **Outputs:** Provides multiple output anchors, corresponding to the boolean outcome (true/false) of the evaluated conditions. The workflow continues along the specific path connected to the output anchor that matches the result.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-13-condition.png" alt="Condition Node" width="375" /><figcaption></figcaption></figure>

---

### **8. Condition Agent Node**

Provides AI-driven dynamic branching based on natural language instructions and context.

-   **Functionality:** This node uses a Large Language Model (LLM) to route the workflow. It analyzes provided input data against a set of user-defined "Scenarios" — potential outcomes or categories — guided by high-level natural language "Instructions" that define the decision-making task. The LLM then determines which scenario best fits the current input context. Based on this AI-driven classification, the workflow execution proceeds down the specific output path corresponding to the chosen scenario. This node is particularly useful for tasks like user intent recognition, complex conditional routing, or nuanced situational decision-making where simple, predefined rules — as in the Condition Node — are insufficient.
-   **Configuration Parameters**
    -   **Model**: Specifies the AI model from a chosen service that will perform the analysis and scenario classification.
    -   **Instructions**: Define the overall goal or task for the LLM in natural language — e.g., "Determine if the user's request is about sales, support, or general inquiry."
    -   **Input**: Specify the data, often text from a previous step or user input, using `{{ variables }}`, that the LLM will analyze to make its routing decision.
    -   **Scenarios**: Configure an array defining the possible outcomes or distinct paths the workflow can take. Each scenario is described in natural language — e.g., "Sales Inquiry," "Support Request," "General Question" — and each corresponds to a unique output anchor on the node.
-   **Inputs:** Requires the `Input` data for analysis and the `Instructions` to guide the LLM.
-   **Outputs:** Provides multiple output anchors, one for each defined `Scenario`. The workflow continues along the specific path connected to the output anchor that the LLM determines best matches the input.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-14-condition-agent.png" alt="Condition Agent Node" width="375" /><figcaption></figcaption></figure>

---

### **9. Iteration Node**

Executes a defined "sub-flow" — a sequence of nodes nested within it — for each item in an input array, implementing a "for-each" loop."

-   **Functionality:** This node is designed for processing collections of data. It takes an array, either provided directly or referenced via a variable, as its input. For every individual element within that array, the Iteration Node sequentially executes the sequence of other nodes that are visually placed inside its boundaries on the canvas.
-   **Configuration Parameters**
    -   **Array Input**: Specifies the input array that the node will iterate over. This is provided by referencing a variable that holds an array from a previous node's output or from the `$flow.state` — e.g., `{{ $flow.state.itemList }}`.
-   **Inputs:** Requires an array to be supplied to its `Array Input` parameter.
-   **Outputs:** Provides a single output anchor that becomes active only after the nested sub-flow has completed execution for all items in the input array. The data passed through this output can include aggregated results or the final state of variables modified within the loop, depending on the design of the sub-flow. Nodes placed inside the iteration block have their own distinct input and output connections that define the sequence of operations for each item.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-15-iteration.png" alt="Iteration Node" width="563" /><figcaption></figcaption></figure>

---

### **10. Loop Node**

Explicitly redirects the workflow execution back to a previously executed node.

-   **Functionality:** This node enables the creation of cycles or iterative retries within a workflow. When the execution flow reaches the Loop Node, it does not proceed forward to a new node; instead, it "jumps" back to a specified target node that has already been executed earlier in the current workflow run. This action causes the re-execution of that target node and any subsequent nodes in that part of the flow.
-   **Configuration Parameters**
    -   **Loop Back To**: Selects the unique ID of a previously executed node within the current workflow to which the execution should return.
    -   **Max Loop Count**: Defines the maximum number of times this loop operation can be performed within a single workflow execution, safeguarding against infinite cycles. The default value is 5.
-   **Inputs:** Receives the execution signal to activate. It internally tracks the number of times the loop has occurred for the current execution.
-   **Outputs:** This node does not have a standard forward-pointing output anchor, as its primary function is to redirect the execution flow backward to the `Loop Back To` target node, from where the workflow then continues.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-16-loop.png" alt="Loop Node" width="375" /><figcaption></figcaption></figure>

---

### **11. Human Input Node**

Pauses the workflow execution to request explicit input, approval, or feedback from a human user — a key component for Human-in-the-Loop (HITL) processes.

-   **Functionality:** This node halts the automated progression of the workflow and presents information or a question to a human user, via the chat interface. The content displayed to the user can either be a predefined, static text or dynamically generated by a LLM based on the current workflow context. The user is provided with distinct action choices — e.g., "Proceed," "Reject" — and, if enabled, a field to provide textual feedback. Once the user makes a selection and submits their response, the workflow resumes execution along the specific output path corresponding to their chosen action.
-   **Configuration Parameters**
    -   **Description Type**: Determines how the message or question presented to the user is generated — either `Fixed` (static text) or `Dynamic` (generated by an LLM).
        -   **If Description Type is `Fixed`**
            -   **Description**: This field contains the exact text to be displayed to the user. It supports the insertion of dynamic data using `{{ variables }}`
        -   **If `Description Type` is `Dynamic`**
            -   **Model**: Selects the AI model from a chosen service that will generate the user-facing message.
            -   **Prompt**: Provides the instructions or prompt for the selected LLM to generate the message shown to the user.
    -   **Feedback:** If enabled, the user will be prompted with a feedback window to leave their feedback, and this feedback will be appended to the node's output.
-   **Inputs:** Receives the execution signal to pause the workflow. It can utilize data from previous steps or `$flow.state` through variables in the `Description` or `Prompt` fields if configured for dynamic content.
-   **Outputs:** Provides two output anchors, each corresponding to a distinct user action — an anchor for "proceed" and another for "reject". The workflow continues along the path connected to the anchor matching the user's selection.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-17-human-input.png" alt="Human Input Node" width="375" /><figcaption></figcaption></figure>

---

### **12. Direct Reply Node**

Sends a final message to the user and terminates the current execution path.

-   **Functionality:** This node serves as an endpoint for a specific branch or the entirety of a workflow. It takes a configured message — which can be static text or dynamic content from a variable — and delivers it directly to the end-user through the chat interface. Upon sending this message, the execution along this particular path of the workflow concludes; no further nodes connected from this point will be processed.
-   **Configuration Parameters**
    -   **Message**: Define the text or variable `{{ variable }}` that holds the content to be sent as the final reply to the user.
-   **Inputs:** Receives the message content, which is sourced from a previous node's output or a value stored in `$flow.state`.
-   **Outputs:** This node has no output anchors, as its function is to terminate the execution path after sending the reply.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-18-direct-reply.png" alt="Direct Reply Node" width="375" /><figcaption></figcaption></figure>

---

### **13. Custom Function Node**

Provides a mechanism for executing custom server-side Javascript code within the workflow.

-   **Functionality:** This node allows to write and run arbitrary Javascript snippets, offering a efective way to implement complex data transformations, bespoke business logic, or interactions with resources not directly supported by other standard nodes. The executed code operates within a Node.js environment and has specific ways to access data:
    -   **Input Variables:** Values passed via the `Input Variables` configuration are accessible within the function, typically prefixed with `$` — e.g., if an input variable `userid` is defined, it can be accessed as `$userid`.
    -   **Flow Context:** Default flow configuration variables are available, such as `$flow.sessionId`, `$flow.chatId`, `$flow.chatflowId`, `$flow.input` — the initial input that started the workflow — and the entire `$flow.state` object.
    -   **Custom Variables:** Any custom variables set up in AnswerAgent/Flowise — e.g., `$vars.<variable-name>`.
    -   **Libraries:** The function can utilize any libraries that have been imported and made available within the AnswerAgent/Flowise backend environment.**The function must return a string value at the end of its execution**.
-   **Configuration Parameters**
    -   **Input Variables**: Configure an array of input definitions that will be passed as variables into the scope of your Javascript function. For each variable you wish to define, you will specify:
        -   **Variable Name**: The name you will use to refer to this variable within your Javascript code, typically prefixed with a `$` — e.g., if you enter `myValue` here, you might access it as `$myValue` in the script, corresponding to how input schema properties are mapped.
        -   **Variable Value**: The actual data to be assigned to this variable, which can be static text or, more commonly, a dynamic value sourced from the workflow — e.g., `{{ previousNode.output }}` or `{{ $flow.state.someKey }}`.
    -   **Javascript Function**: The code editor field where the server-side Javascript function is written. This function must ultimately return a string value.
    -   **Update Flow State**: Allows the node to modify the workflow's runtime state `$flow.state` during execution by updating pre-defined keys. This makes it possible, for example, to store this Custom Function node's string output under such a key, making it accessible to subsequent nodes.
-   **Inputs:** Receives data through the variables configured in `Input Variables`. Can also implicitly access elements of the `$flow` context and `$vars`.
-   **Outputs:** Produces the string value returned by the executed Javascript function.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-19-custom-function.png" alt="Custom Function Node" width="375" /><figcaption></figcaption></figure>

---

### **14. Execute Flow Node**

Enables the invocation and execution of another complete AnswerAgent/Flowise Chatflow or AgentFlow from within the current workflow.

-   **Functionality:** This node functions as a sub-workflow caller, promoting modular design and reusability of logic. It allows the current workflow to trigger a separate, pre-existing workflow — identified by its name or ID within the AnswerAgent/Flowise instance — pass an initial input to it, optionally override specific configurations of the target flow for that particular run, and then receive its final output back into the calling workflow to continue processing.
-   **Configuration Parameters**
    -   **Connect Credential**: Optionally provide Chatflow API credentials if the target flow being called requires specific authentication or permissions for execution.
    -   **Select Flow**: Specify the particular Chatflow or AgentFlow that this node will execute from the list of available flows in your AnswerAgent/Flowise instance.
    -   **Input**: Define the data — static text or `{{ variable }}` — that will be passed as the primary input to the target workflow when it is invoked.
    -   **Override Config**: Optionally provide a JSON object containing parameters that will override the default configuration of the target workflow specifically for this execution instance — e.g., temporarily changing a model or prompt used in the sub-flow.
    -   **Base URL**: Optionally specify an alternative base URL for the AnswerAgent/Flowise instance that hosts the target flow. This is useful in distributed setups or when flows are accessed via different routes, defaulting to the current instance's URL if not set.
    -   **Return Response As**: Determine how the final output from the executed sub-flow should be categorized when it's returned to the current workflow — as a `User Message` or `Assistant Message`.
    -   **Update Flow State**: Allows the node to modify the workflow's runtime state `$flow.state` during execution by updating pre-defined keys. This makes it possible, for example, to store this Execute Flow node's output under such a key, making it accessible to subsequent nodes.
-   **Inputs:** Requires the selection of a target flow and the `Input` data for it.
-   **Outputs:** Produces the final output returned by the executed target workflow, formatted according to the `Return Response As` setting.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-20-execute-flow.png" alt="Execute Flow Node" width="375" /><figcaption></figcaption></figure>

## Understanding Flow State

A key architectural feature enabling the flexibility and data management capabilities of AgentFlow V2 is the **Flow State**. This mechanism provides a way to manage and share data dynamically throughout the execution of a single workflow instance.

### **What is Flow State?**

-   Flow State (`$flow.state`) is a **runtime, key-value store** that is shared among the nodes in a single execution.
-   It functions as temporary memory or a shared context that exists only for the duration of that particular run/execution.

### **Purpose of Flow State**

The primary purpose of `$flow.state` is to enable **explicit data sharing and communication between nodes, especially those that may not be directly connected** in the workflow graph, or when data needs to be intentionally persisted and modified across multiple steps. It addresses several common orchestration challenges:

1. **Passing Data Across Branches:** If a workflow splits into conditional paths, data generated or updated in one branch can be stored in `$flow.state` to be accessed later if the paths merge or if other branches need that information.
2. **Accessing Data Across Non-Adjacent Steps:** Information initialized or updated by an early node can be retrieved by a much later node without needing to pass it explicitly through every intermediate node's inputs and outputs.

### **How Flow State Works**

1. **Initialization / Declaration of Keys**
    - All state keys that will be used throughout the workflow **must be initialized** with their default (even if empty) values using the `Flow State` parameter within the **Start node**. This step effectively declares the schema or structure of your `$flow.state` for that workflow. You define the initial key-value pairs here.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-21-flowstate.png" alt="Flow State Initialization" /><figcaption></figcaption></figure>

2. **Updating State / Modifying Existing Keys**

-   Many operational nodes — e.g., `LLM`, `Agent`, `Tool`, `HTTP`, `Retriever`, `Custom Function` — include an `Update Flow State` parameter in their configuration.
-   This parameter allows the node to **modify the values of pre-existing keys** within `$flow.state`.
-   The value can be static text, the direct output of the current node, output from previous node, and many other variables. Type `{{` will show all the available variables.
-   When the node executes successfully, it **updates** the specified key(s) in `$flow.state` with the new value(s). **New keys cannot be created by operational nodes; only pre-defined keys can be updated.**

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-22-update-flowstate.png" alt="Update Flow State" /><figcaption></figcaption></figure>

3. **Reading from State**

-   Any node input parameter that accepts variables can read values from the Flow State.
-   Use the specific syntax: `{{ $flow.state.yourKey }}` — replace `yourKey` with the actual key name that was initialized in the Start Node.
-   For example, an LLM node's prompt might include `"...based on the user status: {{ $flow.state.customerStatus }}"`.

<figure><img src="/.gitbook/assets/agentflowsv2/agentflowsv2-23-use-flowstate.png" alt="Using Flow State" /><figcaption></figcaption></figure>

### **Scope and Persistence:**

-   It is created and initialized when a workflow execution begins and is destroyed when that specific execution ends.
-   It does **not** persist across different user sessions or separate runs of the same workflow.
-   Each concurrent execution of the workflow maintains its own independent `$flow.state`.
