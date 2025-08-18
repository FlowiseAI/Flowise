---
description: Learn how to connect your AnswerAgentAI instance to a database
---

# Databases

## Overview

AnswerAgentAI supports four database types:

1. SQLite (Default)
2. MySQL
3. PostgreSQL
4. MariaDB

This guide will walk you through the process of configuring each database type for use with AnswerAgentAI.

## SQLite (Default)

SQLite is the default database for AnswerAgentAI. To configure it, use the following environment variables:

```sh
DATABASE_TYPE=sqlite
DATABASE_PATH=/root/.answerai #your preferred location
```

A `database.sqlite` file will be created and saved in the path specified by `DATABASE_PATH`. If not specified, the default storage path will be in your home directory -> .answerai

**Note:** If no database environment variables are specified, SQLite will be the fallback database choice.

## MySQL

To configure MySQL, use the following environment variables:

```sh
DATABASE_TYPE=mysql
DATABASE_PORT=3306
DATABASE_HOST=localhost
DATABASE_NAME=answerai
DATABASE_USER=user
DATABASE_PASSWORD=123
```

Ensure that you have created the database and granted the necessary permissions to the user before connecting AnswerAgentAI.

## PostgreSQL

For PostgreSQL configuration, use these environment variables:

```sh
DATABASE_TYPE=postgres
DATABASE_PORT=5432
DATABASE_HOST=localhost
DATABASE_NAME=answerai
DATABASE_USER=user
DATABASE_PASSWORD=123
PGSSLMODE=require
```

Make sure you have created the database and granted the appropriate permissions to the user before connecting AnswerAgentAI.

## MariaDB

To configure MariaDB, use the following environment variables:

```bash
DATABASE_TYPE=mariadb
DATABASE_PORT=3306
DATABASE_HOST=localhost
DATABASE_NAME=answerai
DATABASE_USER=answerai
DATABASE_PASSWORD=mypassword
```

As with the other database types, ensure that you have created the database and granted the necessary permissions to the user before connecting AnswerAgentAI.

## Database Synchronization in Production

AnswerAgentAI uses [TypeORM](https://typeorm.io/data-source-options#common-data-source-options) to configure database connections. By default, the `synchronize` option is set to `true`. This means that the database schema will be automatically created on every application launch.

**Warning:** Be cautious with this option in production environments. Enabling `synchronize` in production can lead to **data loss**. This option is primarily useful during development and debugging.

To override the `synchronize` value, set the following environment variable:

```sh
OVERRIDE_DATABASE=false
```

## Best Practices

1. **Development Environment:**

    - Use SQLite for quick setup and testing.
    - Enable `synchronize` to automatically update the schema during development.

2. **Production Environment:**

    - Use a more robust database like MySQL, PostgreSQL, or MariaDB.
    - Disable `synchronize` by setting `OVERRIDE_DATABASE=false`.
    - Implement proper database migration strategies for schema changes.

3. **Security:**

    - Use strong, unique passwords for your database users.
    - Limit database user permissions to only what's necessary for AnswerAgentAI.
    - Use SSL/TLS connections when possible, especially if your database is on a different server.

4. **Performance:**
    - Regularly maintain and optimize your database.
    - Monitor database performance and scale resources as needed.

## Troubleshooting

-   If you encounter connection issues, verify that the database server is running and accessible from your AnswerAgentAI instance.
-   Double-check your environment variables for typos or incorrect values.
-   Ensure that the specified database and user exist and have the necessary permissions.
-   Check AnswerAgentAI logs for any database-related error messages.

## Video Tutorial

For a visual guide on using SQLite and MySQL/MariaDB with AnswerAgentAI, watch this tutorial:

<!-- TODO: Update the video URL to an AnswerAgentAI-specific tutorial when available -->
<iframe src="https://www.youtube.com/embed/R-6uV1Cb8I8"></iframe>

Remember to always backup your data before making any changes to your database configuration or performing migrations.
