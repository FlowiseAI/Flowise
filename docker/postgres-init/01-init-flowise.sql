-- PostgreSQL initialization script to create flowise database
-- This script runs only when the PostgreSQL container is initialized for the first time

-- Create flowise database if it doesn't exist
SELECT 'CREATE DATABASE flowise'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'flowise')\gexec

-- Grant all privileges on flowise database to example_user
GRANT ALL PRIVILEGES ON DATABASE flowise TO example_user;