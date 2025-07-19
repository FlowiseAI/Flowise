-- Setup script for AAI Vector (Postgres) table
-- Run this in your AAI Postgres database

-- 1. Install pgvector extension (requires superuser privileges)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the vector table (using default table name 'documents')
-- You can change 'documents' to match your AAI_DEFAULT_POSTGRES_VECTORSTORE_TABLE_NAME
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "pageContent" TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536)  -- Adjust dimension based on your embeddings (1536 for OpenAI)
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS documents_metadata_idx ON documents USING gin (metadata);

-- 4. Grant permissions (adjust username as needed)
-- GRANT ALL ON documents TO your_aai_user;

-- Check if everything was created successfully
SELECT 'Extension vector installed' as status WHERE EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
);

SELECT 'Table documents created' as status WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'documents' AND table_schema = 'public'
);

-- Show table structure
\d documents; 