---
description: Learn how to use the Vectara QA Chain feature in AnswerAI
---

# Vectara QA Chain

## Overview

The Vectara QA Chain is a powerful feature in AnswerAI that enables you to perform question-answering tasks using Vectara's advanced retrieval and summarization capabilities. This chain allows you to query your knowledge base in natural language and receive concise, relevant answers based on the information stored in your Vectara vector store.

## Key Benefits

.

1. Natural Language Querying: Ask questions in plain language and receive coherent, contextual answers.
2. Customizable Summarization: Choose from different summarizer models to tailor the response generation to your needs.
3. Multilingual Support: Obtain responses in various languages, making it suitable for global applications.

## How to Use

Follow these steps to set up and use the Vectara QA Chain:

1.  Connect Vectara Store:
    Select your pre-configured Vectara vector store as the source of information for the QA chain.

2.  Choose Summarizer Model:
    Select a summarizer prompt name from the available options:

    -   vectara-summary-ext-v1.2.0 (GPT-3.5-turbo, available to all users)
    -   vectara-experimental-summary-ext-2023-10-23-small (GPT-3.5-turbo, beta for Growth and Scale users)
    -   vectara-summary-ext-v1.3.0 (GPT-4.0, available to Scale users)
    -   vectara-experimental-summary-ext-2023-10-23-med (GPT-4.0, beta for Scale users)

             <!-- TODO: Screenshot of summarizer model selection dropdown -->

          <figure><img src="/.gitbook/assets/screenshots/vectorqachainsummarizer.png" alt="" /><figcaption><p>Vectera QA Chain Summarizer Model &#x26; Drop UI</p></figcaption></figure>

3.  Set Response Language (Optional):
    Choose the desired language for the response from the provided list. If not selected, Vectara will automatically detect the language.

4.  Configure Max Summarized Results:
    Set the maximum number of top results to use in generating the summarized response. The default is 7.

5.  Enable Input Moderation (Optional):
    Set up input moderation to filter out potentially harmful queries before they reach the language model.

6.  Run Your Query:
    Enter your question, and the Vectara QA Chain will process it, retrieve relevant information, and generate a summarized answer.

## Tips and Best Practices

1. Refine Your Questions: Be specific in your queries to get more accurate and relevant answers.

2. Experiment with Summarizers: Try different summarizer models to find the one that best suits your use case and content type.

3. Adjust Max Summarized Results: Increase this number for more comprehensive answers or decrease it for quicker, more concise responses.

4. Leverage Multilingual Capabilities: Use the response language feature to cater to diverse audience needs.

5. Monitor Performance: Pay attention to response times and quality to optimize your chain configuration.

## Troubleshooting

1. Unexpected or Irrelevant Answers:

    - Review and refine the content in your Vectara store.
    - Try rephrasing your question or using more specific terms.

2. Slow Response Times:

    - Reduce the number of max summarized results.
    - Check your Vectara store's performance and indexing.

3. Language Issues:

    - Ensure you've selected the correct response language.
    - Verify that your Vectara store contains content in the desired language.

4. Summarizer Errors:
    - If you encounter a "BAD REQUEST" error related to summarization, try reducing the number of search results or adjusting the context parameters.
    - Ensure you're using a summarizer that's available for your Vectara account tier.

Remember, the effectiveness of the Vectara QA Chain depends on the quality and relevance of the data in your Vectara store. Regularly update and maintain your knowledge base to ensure the best possible answers to your queries.
