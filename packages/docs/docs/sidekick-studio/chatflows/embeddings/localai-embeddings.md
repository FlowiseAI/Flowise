---
description: Use local embeddings models with AnswerAgentAI
---

# LocalAI Embeddings

## Overview

LocalAI Embeddings is a powerful feature in AnswerAgentAI that allows you to use local embeddings models, such as those compatible with the ggml format. This feature enables you to run Language Learning Models (LLMs) locally or on-premises using consumer-grade hardware, providing a more private and customizable alternative to cloud-based solutions.

## Key Benefits

-   **Privacy and Security**: Run embeddings locally, keeping your data on your own hardware.
-   **Customization**: Use a wide variety of models compatible with the ggml format.
-   **Cost-effective**: Eliminate the need for expensive cloud API calls by using your own computing resources.

## How to Use

### Step 1: Set up LocalAI

1. Clone the LocalAI repository:

    ```bash
    git clone https://github.com/go-skynet/LocalAI
    ```

2. Navigate to the LocalAI directory:

    ```bash
    cd LocalAI
    ```

3. Download a model using LocalAI's API endpoint. For this example, we'll use the BERT Embeddings model:

<!-- TODO: Screenshot showing the LocalAI API endpoint for downloading the BERT Embeddings model -->

4. Verify that the model has been downloaded to the `/models` folder:

<!-- TODO: Screenshot showing the downloaded model in the /models folder -->

5. Test the embeddings by running:

    ```bash
    curl http://localhost:8080/v1/embeddings -H "Content-Type: application/json" -d '{
        "input": "Test",
        "model": "text-embedding-ada-002"
      }'
    ```

6. You should receive a response similar to this:

<!-- TODO: Screenshot showing the response from the curl command -->

### Step 2: Configure AnswerAgentAI

1. In the AnswerAgentAI canvas, drag and drop a new LocalAIEmbeddings component:

<!-- TODO: Screenshot showing the LocalAIEmbeddings component being added to the canvas -->
<figure><img src="/.gitbook/assets/screenshots/localembeddingsai.png" alt="" /><figcaption><p> LocalAIEmbeddings Node  &#x26; Drop UI</p></figcaption></figure>

2. Fill in the required fields:
    - **Base Path**: Enter the base URL for LocalAI (e.g., `http://localhost:8080/v1`)
    - **Model Name**: Specify the model you want to use (e.g., `text-embedding-ada-002`)

## Tips and Best Practices

1. Ensure that the model you specify in AnswerAgentAI matches the one you've downloaded to the `/models` folder in LocalAI.
2. Keep your local models up to date to benefit from the latest improvements in embedding technology.
3. Experiment with different models to find the best balance between performance and resource usage for your specific use case.

## Troubleshooting

1. **Model not found error**: Make sure the model name specified in AnswerAgentAI exactly matches the filename in the `/models` folder of LocalAI.
2. **Connection issues**: Verify that LocalAI is running and accessible at the specified base path.
3. **Slow performance**: Consider using a more powerful machine or optimizing your LocalAI setup for better performance.

For more detailed information on LocalAI and its capabilities, refer to the [LocalAI documentation](https://localai.io/models/index.html#embeddings-bert).
