# Deploying Flowise to Railway

This guide provides instructions for deploying Flowise to Railway platform.

## Setup

The project includes the necessary configuration files for Railway deployment:

1. `docker/Dockerfile.railway` - Custom Dockerfile that builds the app from source
2. `railway.toml` - Railway configuration file

## Deployment Steps

1. Create a new project on Railway
2. Link your GitHub repository
3. Set environment variables in Railway dashboard:
   - `FLOWISE_USERNAME` - Admin username for Flowise
   - `FLOWISE_PASSWORD` - Admin password for Flowise

## Persistent Storage

Railway provides persistent storage. The configuration is set to store Flowise data in the `/data` directory:

- `DATABASE_PATH=/data/.flowise`
- `APIKEY_PATH=/data/.flowise`
- `SECRETKEY_PATH=/data/.flowise`
- `LOG_PATH=/data/logs`

## Environment Variables

You can set the following environment variables in Railway dashboard:

| Variable | Description | Default |
|----------|-------------|---------|
| `FLOWISE_USERNAME` | Admin username | - |
| `FLOWISE_PASSWORD` | Admin password | - |
| `PORT` | Port for the app | 3000 |
| `DATABASE_PATH` | Path to database | /data/.flowise |
| `APIKEY_PATH` | Path for API keys | /data/.flowise |
| `SECRETKEY_PATH` | Path for secret keys | /data/.flowise |
| `LOG_PATH` | Path for logs | /data/logs |
| `EXECUTION_PATH` | Path to server dist folder | /app/packages/server/dist |

## Customization

If you need to modify the build or deployment configuration:

1. Edit `docker/Dockerfile.railway` to change the build process
2. Edit `railway.toml` to change deployment settings

## Troubleshooting

If you encounter issues with the deployment:

1. Check Railway logs to identify errors
2. Ensure your environment variables are set correctly
3. Verify that your repository structure matches the expected structure in the Dockerfile

## Resources

- [Railway Documentation](https://docs.railway.app)
- [Flowise Documentation](https://docs.flowiseai.com)