#!/bin/bash

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -p 5432 -U example_user
do
  echo "Waiting for database connection..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Create flowise database if it doesn't exist
echo "Creating flowise database if needed..."
PGPASSWORD=example_password psql -h postgres -U example_user -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'flowise'" | grep -q 1 || \
PGPASSWORD=example_password psql -h postgres -U example_user -d postgres -c "CREATE DATABASE flowise"

echo "Flowise database ready!"

# Run Prisma migrations for the web app
echo "Running Prisma migrations..."
cd /app/packages-answers/db
npm run db:deploy

echo "Database initialization complete!"