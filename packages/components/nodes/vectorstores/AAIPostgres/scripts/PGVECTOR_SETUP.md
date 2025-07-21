# 🔧 pgvector Setup Guide for AAI Postgres Vector Store

This guide helps you install and configure the pgvector extension for use with the AAI Postgres Vector Store node in TheAnswer platform.

## 🚨 Quick Fix

If you're seeing the error `extension "vector" is not available`, you need to install pgvector on your PostgreSQL server.

### Option 1: Use Our Helper Script (Recommended)

```bash
# From your project root directory
node packages/components/nodes/vectorstores/AAIPostgres/scripts/install_pgvector_extension.js
```

### Option 2: Manual Installation

1. **Install pgvector on your PostgreSQL server** (see platform-specific instructions below)
2. **Enable the extension**:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    ```

---

## 📋 Platform-Specific Installation

### macOS

#### Using Homebrew (Recommended)

```bash
# Install pgvector
brew install pgvector

# Restart PostgreSQL service
brew services restart postgresql
```

#### Using MacPorts

```bash
sudo port install pgvector
```

### Ubuntu/Debian

```bash
# For PostgreSQL 15
sudo apt update
sudo apt install postgresql-15-pgvector

# For PostgreSQL 14
sudo apt install postgresql-14-pgvector

# For PostgreSQL 13
sudo apt install postgresql-13-pgvector

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### CentOS/RHEL/Fedora

```bash
# Install development tools if not already installed
sudo yum groupinstall "Development Tools"
sudo yum install postgresql-devel

# Clone and build pgvector
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Docker

#### Option 1: Use Pre-built Image with pgvector

```yaml
# docker-compose.yml
version: '3.8'
services:
    postgres:
        image: pgvector/pgvector:pg15
        environment:
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: postgres
            POSTGRES_DB: postgres
        ports:
            - '5432:5432'
        volumes:
            - postgres_data:/var/lib/postgresql/data

volumes:
    postgres_data:
```

#### Option 2: Add pgvector to Existing Container

```dockerfile
FROM postgres:15

RUN apt-get update \
    && apt-get install -y postgresql-15-pgvector \
    && rm -rf /var/lib/apt/lists/*
```

### Windows

#### Using PostgreSQL Windows Installer

1. Download pgvector Windows binaries from [releases page](https://github.com/pgvector/pgvector/releases)
2. Extract files to your PostgreSQL installation directory
3. Restart PostgreSQL service

#### Using WSL2

Follow the Ubuntu/Debian instructions within WSL2.

---

## 🔧 Enabling the Extension

After installing pgvector on your server, you need to enable it in your database:

### Method 1: Using psql Command Line

```bash
# Connect to your database
psql -U postgres -d your_database_name

# Enable the extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

# Exit psql
\q
```

### Method 2: Using Our Helper Script

```bash
# From your project root
node packages/components/nodes/vectorstores/AAIPostgres/scripts/install_pgvector_extension.js
```

### Method 3: Using SQL Client

Connect with any PostgreSQL client (pgAdmin, DBeaver, etc.) and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## ✅ Verification

### Check Extension Installation

```sql
-- Check if extension is available
SELECT name, default_version
FROM pg_available_extensions
WHERE name = 'vector';

-- Check if extension is installed
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';
```

### Test Vector Operations

```sql
-- Create a test table
CREATE TABLE test_vectors (
    id SERIAL PRIMARY KEY,
    embedding vector(3)
);

-- Insert test data
INSERT INTO test_vectors (embedding) VALUES ('[1,2,3]'), ('[4,5,6]');

-- Test similarity search
SELECT id, embedding, embedding <-> '[1,2,3]' AS distance
FROM test_vectors
ORDER BY distance
LIMIT 1;

-- Clean up
DROP TABLE test_vectors;
```

---

## 🔧 Troubleshooting

### Permission Denied Error

If you get a permission denied error when trying to create the extension:

```sql
-- Connect as superuser
psql -U postgres -d your_database

-- Or grant privileges to your user
GRANT CREATE ON DATABASE your_database TO your_user;
```

### Extension Not Available

If pgvector shows as "not available":

1. **Check PostgreSQL version compatibility**

    ```sql
    SELECT version();
    ```

    pgvector supports PostgreSQL 11+

2. **Verify installation paths**

    ```bash
    # Check if pgvector files are in the right location
    find /usr -name "vector.*" 2>/dev/null
    ```

3. **Check PostgreSQL configuration**
    ```sql
    SHOW config_file;
    ```

### Database Connection Issues

If the AAI node can't connect to your database:

1. **Check environment variables**:

    ```bash
    echo $AAI_DEFAULT_POSTGRES_VECTORSTORE_HOST
    echo $AAI_DEFAULT_POSTGRES_VECTORSTORE_DATABASE
    echo $AAI_DEFAULT_POSTGRES_VECTORSTORE_USER
    ```

2. **Test connection manually**:
    ```bash
    psql -h $AAI_DEFAULT_POSTGRES_VECTORSTORE_HOST \
         -U $AAI_DEFAULT_POSTGRES_VECTORSTORE_USER \
         -d $AAI_DEFAULT_POSTGRES_VECTORSTORE_DATABASE
    ```

### Migration Failing

If the migration `AddPgvectorExtension1752614575000` is failing:

1. **The migration is now non-blocking** - it will warn but not fail
2. **Install pgvector manually** using the methods above
3. **Re-run the application** - it should work after manual installation

---

## 🌐 Cloud Provider Setup

### AWS RDS

AWS RDS PostgreSQL doesn't support pgvector by default. Consider:

-   Amazon Aurora PostgreSQL (supports pgvector in recent versions)
-   Self-managed PostgreSQL on EC2
-   Amazon MemoryDB for Redis with vector support

### Google Cloud SQL

Google Cloud SQL PostgreSQL supports pgvector:

1. Create a PostgreSQL instance (version 12+)
2. Enable the extension via Cloud Console or gcloud CLI
3. Connect and create the extension

### Azure Database for PostgreSQL

Azure supports pgvector in Flexible Server:

1. Use Flexible Server (not Single Server)
2. Enable the extension through Azure portal
3. Connect and create the extension

### Supabase

Supabase has pgvector pre-installed:

```sql
-- Just enable it in your database
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 🔄 Next Steps

After successfully installing pgvector:

1. **Restart your AAI application**
2. **Try using the AAI Postgres Vector Store node**
3. **Upload some documents to test vector storage**
4. **Verify vectors are being stored properly**

## 📚 Additional Resources

-   [pgvector GitHub Repository](https://github.com/pgvector/pgvector)
-   [pgvector Documentation](https://github.com/pgvector/pgvector#getting-started)
-   [PostgreSQL Extensions Guide](https://www.postgresql.org/docs/current/extend-extensions.html)

---

## 🆘 Still Having Issues?

If you're still having problems:

1. **Check the AAI Postgres node error messages** - they now provide detailed installation instructions
2. **Run our diagnostic script**: `node packages/components/nodes/vectorstores/AAIPostgres/scripts/install_pgvector_extension.js`
3. **Check PostgreSQL logs** for more detailed error messages
4. **Ensure your database user has CREATE privileges**

Remember: The AAI Postgres Vector Store will now provide helpful error messages if pgvector is missing, guiding you through the installation process.
