---
description: Learn how to query structured data
---

# SQL QnA

---

Unlike previous examples like [Web Scrape QnA](web-scrape-qna.md) and [Multiple Documents QnA](multiple-documents-qna.md), querying structured data does not require a vector database. At the high-level, this can be achieved with following steps:

1. Providing the LLM:
    - overview of the SQL database schema
    - example rows data
2. Return a SQL query with few shot prompting
3. Validate the SQL query using an [If Else](../../sidekick-studio/chatflows/utilities/if-else.md) node
4. Create a custom function to execute the SQL query, and get the response
5. Return a natural response from the executed SQL response

<figure><img src="/.gitbook/assets/image (113).png" alt="" /><figcaption></figcaption></figure>

In this example, we are going to create a QnA chatbot that can interact with a SQL database stored in SingleStore

<figure><img src="/.gitbook/assets/image (116).png" alt="" /><figcaption></figcaption></figure>

## TL;DR

You can find the chatflow template:

<a href="/.gitbook/assets/SQL Chatflow.json" download>Download /.gitbook/assets/SQL Chatflow.json</a>

## 1. SQL Database Schema + Example Rows

Use a Custom JS Function node to connect to SingleStore, retrieve database schema and top 3 rows.

From the [research paper](https://arxiv.org/abs/2204.00498), it is recommended to generate a prompt with following example format:

```
CREATE TABLE samples (firstName varchar NOT NULL, lastName varchar)
SELECT * FROM samples LIMIT 3
firstName lastName
Stephen Tyler
Jack McGinnis
Steven Repici
```

<figure><img src="/.gitbook/assets/image (114).png" alt="" /><figcaption></figcaption></figure>

<details>

<summary>Full Javascript Code</summary>

```javascript
const HOST = 'singlestore-host.com'
const USER = 'admin'
const PASSWORD = 'mypassword'
const DATABASE = 'mydb'
const TABLE = 'samples'
const mysql = require('mysql2/promise')

let sqlSchemaPrompt

function getSQLPrompt() {
    return new Promise(async (resolve, reject) => {
        try {
            const singleStoreConnection = mysql.createPool({
                host: HOST,
                user: USER,
                password: PASSWORD,
                database: DATABASE
            })

            // Get schema info
            const [schemaInfo] = await singleStoreConnection.execute(
                `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = "${TABLE}"`
            )

            const createColumns = []
            const columnNames = []

            for (const schemaData of schemaInfo) {
                columnNames.push(`${schemaData['COLUMN_NAME']}`)
                createColumns.push(
                    `${schemaData['COLUMN_NAME']} ${schemaData['COLUMN_TYPE']} ${schemaData['IS_NULLABLE'] === 'NO' ? 'NOT NULL' : ''}`
                )
            }

            const sqlCreateTableQuery = `CREATE TABLE samples (${createColumns.join(', ')})`
            const sqlSelectTableQuery = `SELECT * FROM samples LIMIT 3`

            // Get first 3 rows
            const [rows] = await singleStoreConnection.execute(sqlSelectTableQuery)

            const allValues = []
            for (const row of rows) {
                const rowValues = []
                for (const colName in row) {
                    rowValues.push(row[colName])
                }
                allValues.push(rowValues.join(' '))
            }

            sqlSchemaPrompt = sqlCreateTableQuery + '\n' + sqlSelectTableQuery + '\n' + columnNames.join(' ') + '\n' + allValues.join('\n')

            resolve()
        } catch (e) {
            console.error(e)
            return reject(e)
        }
    })
}

async function main() {
    await getSQLPrompt()
}

await main()

return sqlSchemaPrompt
```

</details>

Once finished, click Execute:

<figure><img src="/.gitbook/assets/image (117).png" alt="" /><figcaption></figcaption></figure>

We can now see the correct format has been generated. Next step is to bring this into Prompt Template.

## 2. Return a SQL query with few shot prompting

Create a new Chat Model + Prompt Template + LLMChain

<figure><img src="/.gitbook/assets/image (118).png" alt="" /><figcaption></figcaption></figure>

Specify the following prompt in the Prompt Template:

```
Based on the provided SQL table schema and question below, return a SQL SELECT ALL query that would answer the user's question. For example: SELECT * FROM table WHERE id = '1'.
------------
SCHEMA: \{schema\}
------------
QUESTION: \{question\}
------------
SQL QUERY:
```

Since we are using 2 variables: \{schema\} and \{question\}, specify their values in **Format Prompt Values**:

<figure><img src="/.gitbook/assets/image (122).png" alt="" width="563" /><figcaption></figcaption></figure>

:::info
You can provide more examples to the prompt (i.e few-shot prompting) to let the LLM learns better. Or take reference from [dialect-specific prompting](https://js.langchain.com/docs/use_cases/sql/prompting#dialect-specific-prompting)
:::

## 3. Validate the SQL query using [If Else](../../sidekick-studio/chatflows/utilities/if-else.md) node

Sometimes the SQL query is invalid, and we do not want to waste resources the execute an invalid SQL query. For example, if a user is asking a general question that is irrelevant to the SQL database. We can use an `If Else` node to route to different path.

For instance, we can perform a basic check to see if SELECT and WHERE are included in the SQL query given by the LLM.

<!-- {% tabs %}
{% tab title="If Function" %}
```javascript
const sqlQuery = $sqlQuery.trim();

if (sqlQuery.includes("SELECT") && sqlQuery.includes("WHERE")) {
    return sqlQuery;
}
```
{% endtab %}

{% tab title="Else Function" %}
```javascript
return $sqlQuery;
```
{% endtab %}
{% endtabs %} -->

<figure><img src="/.gitbook/assets/image (119).png" alt="" width="327" /><figcaption></figcaption></figure>

In the Else Function, we will route to a Prompt Template + LLMChain that basically tells LLM that it is unable to answer user query:

<figure><img src="/.gitbook/assets/image (120).png" alt="" /><figcaption></figcaption></figure>

## 4. Custom function to execute SQL query, and get the response

If it is a valid SQL query, we need to execute the query. Connect the _**True**_ output from **If Else** node to a **Custom JS Function** node:

<figure><img src="/.gitbook/assets/image (123).png" alt="" width="563" /><figcaption></figcaption></figure>

<details>

<summary>Full Javascript Code</summary>

```javascript
const HOST = 'singlestore-host.com'
const USER = 'admin'
const PASSWORD = 'mypassword'
const DATABASE = 'mydb'
const TABLE = 'samples'
const mysql = require('mysql2/promise')

let result

function getSQLResult() {
    return new Promise(async (resolve, reject) => {
        try {
            const singleStoreConnection = mysql.createPool({
                host: HOST,
                user: USER,
                password: PASSWORD,
                database: DATABASE
            })

            const [rows] = await singleStoreConnection.execute($sqlQuery)

            result = JSON.stringify(rows)

            resolve()
        } catch (e) {
            console.error(e)
            return reject(e)
        }
    })
}

async function main() {
    await getSQLResult()
}

await main()

return result
```

</details>

## 5. Return a natural response from the executed SQL response

Create a new Chat Model + Prompt Template + LLMChain

<figure><img src="/.gitbook/assets/image (124).png" alt="" /><figcaption></figcaption></figure>

Write the following prompt in the Prompt Template:

```
Based on the question, and SQL response, write a natural language response, be details as possible:
------------
QUESTION: {question}
------------
SQL RESPONSE: {sqlResponse}
------------
NATURAL LANGUAGE RESPONSE:
```

Specify the variables in **Format Prompt Values**:

<figure><img src="/.gitbook/assets/image (125).png" alt="" width="563" /><figcaption></figcaption></figure>

Voila! Your SQL chatbot is now ready for testing!

## Query

First, let's ask something related to the database.

<figure><img src="/.gitbook/assets/image (128).png" alt="" width="434" /><figcaption></figcaption></figure>

Looking at the logs, we can see the first LLMChain is able to give us a SQL query:

**Input:**

```
Based on the provided SQL table schema and question below, return a SQL SELECT ALL query that would answer the user's question. For example: SELECT * FROM table WHERE id = '1'.\n------------\nSCHEMA: CREATE TABLE samples (id bigint(20) NOT NULL, firstName varchar(300) NOT NULL, lastName varchar(300) NOT NULL, userAddress varchar(300) NOT NULL, userState varchar(300) NOT NULL, userCode varchar(300) NOT NULL, userPostal varchar(300) NOT NULL, createdate timestamp(6) NOT NULL)\nSELECT * FROM samples LIMIT 3\nid firstName lastName userAddress userState userCode userPostal createdate\n1125899906842627 Steven Repici 14 Kingston St. Oregon NJ 5578 Thu Dec 14 2023 13:06:17 GMT+0800 (Singapore Standard Time)\n1125899906842625 John Doe 120 jefferson st. Riverside NJ 8075 Thu Dec 14 2023 13:04:32 GMT+0800 (Singapore Standard Time)\n1125899906842629 Bert Jet 9th, at Terrace plc Desert City CO 8576 Thu Dec 14 2023 13:07:11 GMT+0800 (Singapore Standard Time)\n------------\nQUESTION: what is the address of John\n------------\nSQL QUERY:
```

**Output**

```sql
SELECT userAddress FROM samples WHERE firstName = 'John'
```

After executing the SQL query, the result is passed to the 2nd LLMChain:

**Input**

```
Based on the question, and SQL response, write a natural language response, be details as possible:\n------------\nQUESTION: what is the address of John\n------------\nSQL RESPONSE: [{\"userAddress\":\"120 jefferson st.\"}]\n------------\nNATURAL LANGUAGE RESPONSE:
```

**Output**

```
The address of John is 120 Jefferson St.
```

Now, we if ask something that is irrelevant to the SQL database, the Else route is taken.

<figure><img src="/.gitbook/assets/image (132).png" alt="" width="428" /><figcaption></figcaption></figure>

For first LLMChain, a SQL query is generated as below:

```sql
SELECT * FROM samples LIMIT 3
```

However, it fails the `If Else` check because it doesn't contains both `SELECT` and `WHERE`, hence entering the Else route that has a prompt that says:

```
Politely say "I'm not able to answer query"
```

And the final output is:

```
I apologize, but I'm not able to answer your query at the moment.
```

## Conclusion

In this example, we have successfully created a SQL chatbot that can interact with your database, and is also able to handle questions that are irrelevant to database. Further improvement includes adding memory to provide conversation history.

You can find the chatflow below:

<a href="/.gitbook/assets/SQL Chatflow.json" download>Download /.gitbook/assets/SQL Chatflow.json</a>
