# PostgreSQL Initialization Scripts

This directory contains SQL scripts that are automatically executed when the PostgreSQL container is initialized for the first time.

## How it works

When the PostgreSQL Docker container starts with an empty data directory, it will execute any `*.sql` files found in the `/docker-entrypoint-initdb.d/` directory in alphabetical order.

## Current Scripts

### 01-init-flowise.sql

-   Creates the `flowise` database if it doesn't exist
-   Grants all privileges on the `flowise` database to `example_user`

## Database Migrations

After the databases are created, you need to run migrations:

1. **Flowise migrations**: Run automatically when the Flowise server starts
2. **Prisma migrations** (for web app): Need to be run manually or via the init script

### Running migrations on fresh setup:

```bash
# Run the initialization script that creates databases and runs migrations
docker-compose exec web bash /app/docker/init-db-and-migrate.sh
```

## Important Notes

1. **First-time only**: These scripts only run when the PostgreSQL container is initialized with an empty data volume. They will NOT run if the data volume already contains a database.

2. **Existing setups**: If you already have a running PostgreSQL container with data, these scripts will not affect it. The scripts are designed to be idempotent and check for existence before creating.

3. **Fresh start**: To trigger these initialization scripts on an existing setup, you need to remove the PostgreSQL data volume:

    ```bash
    docker-compose down -v  # This removes all volumes including postgres_data
    docker-compose up -d
    docker-compose exec web bash /app/docker/init-db-and-migrate.sh  # Run migrations
    ```

4. **Manual execution**: If you need to create the database on an existing setup without losing data, you can manually execute the SQL:
    ```bash
    docker-compose exec postgres psql -U example_user -d postgres -f /docker-entrypoint-initdb.d/01-init-flowise.sql
    ```
