---
description: Learn how to use the SQL Database Chain feature in AnswerAI
---

# SQL Database Chain

## Overview

The SQL Database Chain is a powerful feature in AnswerAI that allows you to query SQL databases using natural language. This feature bridges the gap between human language and SQL, enabling you to interact with your databases more intuitively and efficiently.

## Key Benefits

1. Natural Language Queries: Ask questions about your data in plain English, without writing complex SQL queries.
2. Multiple Database Support: Compatible with SQLite, PostgreSQL, MSSQL, and MySQL databases.
3. Customizable and Flexible: Tailor the chain to your specific needs with various configuration options.

## How to Use

Follow these steps to set up and use the SQL Database Chain:

1.  Select the Language Model:
    Choose a language model that will interpret your natural language queries and generate SQL.

2.  Choose Your Database Type:
    Select the type of database you're working with (SQLite, PostgreSQL, MSSQL, or MySQL).

3.  Provide Connection Details:
    Enter the connection string or file path for your database.

        <!-- TODO: Screenshot of the database connection input fields -->
        <figure><img src="/.gitbook/assets/screenshots/sqldatabasechain.png" alt="" /><figcaption><p>SQL Database Chain &#x26; Drop UI</p></figcaption></figure>

4.  Configure Table Selection (Optional):

    -   To include specific tables: Enter table names separated by commas in the "Include Tables" field.
    -   To exclude specific tables: Enter table names separated by commas in the "Ignore Tables" field.

    Note: You can use either "Include Tables" or "Ignore Tables", but not both simultaneously.

5.  Set Additional Parameters (Optional):

    -   Sample Rows: Specify the number of sample rows to load for each table.
    -   Top K Results: Limit the maximum number of results returned for each query.

6.  Customize the Prompt (Optional):
    If needed, provide a custom prompt to guide the language model's interpretation of your queries.

7.  Enable Input Moderation (Optional):
    Set up input moderation to filter out potentially harmful queries before they reach the language model.

8.  Run Your Query:
    Enter your natural language question about the database, and the SQL Database Chain will process it and return the results.

## Tips and Best Practices

1. Start Simple: Begin with straightforward queries to understand how the system interprets your questions.

2. Be Specific: The more precise your question, the more accurate the results will be.

3. Use Table Names: Including relevant table names in your query can help the system generate more accurate SQL.

4. Leverage Sample Rows: Setting an appropriate number of sample rows can improve the system's understanding of your data structure without overloading it.

5. Optimize with Top K: Use the Top K parameter to limit results for large tables, improving performance and reducing token usage.

6. Customize Prompts Carefully: If you're using a custom prompt, ensure it includes the required variables: `{input}`, `{dialect}`, and `{table_info}`.

## Troubleshooting

1. Connection Issues:

    - Double-check your connection string or file path.
    - Ensure your database is accessible from the environment where AnswerAI is running.

2. Unexpected Results:

    - Verify that you've included all necessary tables if using the "Include Tables" option.
    - Check if any crucial tables are being excluded by the "Ignore Tables" option.

3. Performance Problems:

    - If queries are slow, try reducing the number of sample rows or using the Top K parameter to limit results.

4. Incorrect Interpretations:
    - Rephrase your question to be more specific or include key table names.
    - Consider using a custom prompt to guide the model's interpretation if you're consistently getting incorrect results for certain types of queries.

Remember, the SQL Database Chain is a powerful tool that becomes more effective as you learn to phrase your questions in a way that aligns with your database structure. Don't hesitate to experiment and refine your approach to get the best results.
