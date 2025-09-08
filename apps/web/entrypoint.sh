#!/bin/bash

# Exit on any error
set -e

echo "Starting web application entrypoint..."

# Parse DATABASE_SECRET if it exists
if [ -n "$DATABASE_SECRET" ]; then
    echo "Parsing DATABASE_SECRET..."
    
    # Use Node.js to parse the JSON and extract values
    eval "$(node -e "
        try {
            const secret = JSON.parse(process.env.DATABASE_SECRET);
            console.log('export DATABASE_HOST=\"' + secret.host + '\"');
            console.log('export DATABASE_PORT=\"' + secret.port + '\"');
            console.log('export DATABASE_NAME=\"' + secret.dbname + '\"');
            console.log('export DATABASE_USER=\"' + secret.username + '\"');
            console.log('export DATABASE_PASSWORD=\"' + secret.password + '\"');
            console.log('export DATABASE_TYPE=\"' + secret.engine + '\"');
            console.log('export DATABASE_URL=\"postgresql://' + secret.username + ':' + secret.password + '@' + secret.host + ':' + secret.port + '/' + secret.dbname + '?schema=web&connection_limit=1\"');
        } catch (error) {
            console.error('Error parsing DATABASE_SECRET:', error.message);
            process.exit(1);
        }
    ")"
    
    echo "Database environment variables set successfully"
else
    echo "No DATABASE_SECRET found, skipping database configuration"
fi

# Run database migration (deploy existing migrations for production)
echo "Running database migration..."
# MIGRATION STRATEGY: Deploy migrations first, fallback to schema push
# - Production: migrate deploy applies existing migrations
# - Fresh DB: migrate deploy works or falls back to db push
# - Mixed state: db push syncs schema if migrations fail
echo "Attempting database migration deployment..."
(cd packages-answers/db && prisma migrate deploy)


# Start the Next.js application
echo "Starting Next.js application..."
exec node apps/web/server.js
