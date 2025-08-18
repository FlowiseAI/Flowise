---
description: Using ChatLocalAI with AnswerAgentAI
---

# ChatLocalAI Integration

## Overview

ChatLocalAI is a powerful feature in AnswerAgentAI that allows you to run language models locally or on-premise using consumer-grade hardware. It provides a drop-in replacement REST API compatible with OpenAI API specifications, supporting multiple model families in the ggml format.

## Key Benefits

-   Run language models locally without relying on external cloud services
-   Maintain data privacy and security by keeping everything on-premise
-   Reduce costs associated with cloud-based AI services
-   Support for various model families compatible with the ggml format

## How to Use

### Setting up LocalAI

1. Clone the LocalAI repository:

    ```bash
    git clone https://github.com/go-skynet/LocalAI
    ```

2. Navigate to the LocalAI directory:

    ```bash
    cd LocalAI
    ```

3. Copy your desired model to the `models/` directory. For example, to download the gpt4all-j model:

    ```bash
    wget https://gpt4all.io/models/ggml-gpt4all-j.bin -O models/ggml-gpt4all-j
    ```

    <!-- TODO: Screenshot showing the downloaded model in the models folder -->

4. Start the LocalAI service using Docker:

    ```bash
    docker compose up -d --pull always
    ```

5. Verify the API is accessible:

    ```bash
    curl http://localhost:8080/v1/models
    ```

### Integrating with AnswerAgentAI

1. Open your AnswerAgentAI canvas.

2. Drag and drop a new ChatLocalAI component onto the canvas.

    <!-- TODO: Screenshot of dragging ChatLocalAI component onto the canvas -->
     <figure><img src="/.gitbook/assets/screenshots/chatlocalainnode.png" alt="" /><figcaption><p> ChatLocalAI Node &#x26; Drop UI</p></figcaption></figure>

3. Configure the ChatLocalAI component:

    - Set the **Base Path** to `http://localhost:8080/v1`
    - Set the **Model Name** to the filename of your model (e.g., `ggml-gpt4all-j.bin`)

    <!-- TODO: Screenshot of the configured ChatLocalAI component -->
     <figure><img src="/.gitbook/assets/screenshots/chatlocalai.png" alt="" /><figcaption><p> ChatLocalAI Node Configuration &#x26; Drop UI</p></figcaption></figure>

## Tips and Best Practices

1. Experiment with different models to find the best balance between performance and resource usage for your specific use case.

2. If you're running both AnswerAgentAI and LocalAI on Docker, you may need to adjust the base path:

    - For Windows/macOS: Use `http://host.docker.internal:8080/v1`
    - For Linux: Use `http://172.17.0.1:8080/v1`

3. Regularly update your LocalAI installation to benefit from the latest improvements and model compatibility.

4. If you prefer a user-friendly interface for managing local models, consider using [LM Studio](https://lmstudio.ai/) in conjunction with LocalAI.

## Troubleshooting

1. **Issue**: Cannot connect to LocalAI API
   **Solution**: Ensure that the LocalAI service is running and that the base path is correct. Check your firewall settings if necessary.

2. **Issue**: Model not found
   **Solution**: Verify that the model file is present in the `models/` directory of your LocalAI installation and that the model name in AnswerAgentAI matches the filename exactly.

3. **Issue**: Poor performance or high resource usage
   **Solution**: Try using a smaller or more efficient model, or upgrade your hardware if possible.

For more detailed information and advanced usage, refer to the [LocalAI documentation](https://localai.io/basics/getting_started/index.html).

<!-- TODO: Embed video tutorial on using LocalAI with AnswerAgentAI -->
