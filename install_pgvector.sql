-- Install pgvector extension for AAI Vector (Postgres) node
-- Run this in your PostgreSQL database (requires superuser or appropriate privileges)

-- 1. Install the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Verify installation
SELECT 
    extname as "Extension Name", 
    extversion as "Version",
    'Extension installed successfully!' as "Status"
FROM pg_extension 
WHERE extname = 'vector';

-- 3. Show current database info
SELECT 
    current_database() as "Database",
    current_user as "User",
    version() as "PostgreSQL Version";

-- Note: The vector table (default: 'documents') will be created automatically 
-- when you first upsert documents using the AAI Vector (Postgres) node. 