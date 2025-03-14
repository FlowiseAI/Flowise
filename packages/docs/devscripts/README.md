# Development Scripts

This directory contains utility scripts for development and maintenance tasks.

## OpenAPI Configuration Scripts

### update-openapi-config.js

This script updates all OpenAPI YAML files in the `openapi` directory with consistent configuration settings.

#### Features

1. **Add localhost server**: Adds `http://localhost:4000/api/v1` as a server option if not already present
2. **Configure authentication**: Sets up Bearer token authentication with a fixed API key value
3. **Update security references**: Updates all security references to use the Bearer token authentication

#### Prerequisites

-   Node.js installed
-   js-yaml package installed

#### Installation

If you haven't installed the required dependencies:

```bash
cd packages/docs
npm install js-yaml
# or with pnpm
pnpm add js-yaml
```

#### Usage

Run the script from the `packages/docs` directory:

```bash
node devscripts/update-openapi-config.js
```

After running the script, you need to regenerate the API documentation:

```bash
node generate-api-docs.js
```

Then build the documentation site:

```bash
npm run build
# or with pnpm
pnpm run build
```

#### How It Works

1. The script reads all YAML files in the `openapi` directory
2. For each file, it:
    - Adds the localhost server if not already present
    - Configures Bearer token authentication
    - Updates all security references to use Bearer token authentication
    - Writes the updated YAML back to the file

### switch-auth-method.js

This script allows you to switch between Bearer token and API key authentication methods in all OpenAPI YAML files.

#### Features

1. **Switch authentication method**: Change between Bearer token and API key authentication
2. **Update security references**: Updates all security references to use the selected authentication method
3. **Consistent API key value**: Maintains the same API key value across all files

#### Usage

Run the script from the `packages/docs` directory, specifying the authentication method:

```bash
# Switch to Bearer token authentication
node devscripts/switch-auth-method.js bearer

# Switch to API key authentication
node devscripts/switch-auth-method.js apikey
```

After running the script, you need to regenerate the API documentation:

```bash
node generate-api-docs.js
```

#### How It Works

1. The script reads all YAML files in the `openapi` directory
2. For each file, it:
    - Updates the security schemes based on the specified authentication method
    - Updates all security references to use the selected authentication method
    - Writes the updated YAML back to the file

### add-localhost-server.js

This script adds or updates the localhost server in all OpenAPI YAML files without changing the authentication method.

#### Features

1. **Add localhost server**: Adds a localhost server if not already present
2. **Update existing server**: Updates an existing localhost server if found
3. **Configurable port**: Allows specifying a custom port (default: 4000)

#### Usage

Run the script from the `packages/docs` directory, optionally specifying a port:

```bash
# Use default port (4000)
node devscripts/add-localhost-server.js

# Specify a custom port
node devscripts/add-localhost-server.js 3000
```

After running the script, you need to regenerate the API documentation:

```bash
node generate-api-docs.js
```

#### How It Works

1. The script reads all YAML files in the `openapi` directory
2. For each file, it:
    - Checks if a localhost server already exists
    - Adds a new localhost server or updates the existing one
    - Writes the updated YAML back to the file

## Customization

To modify the scripts for different requirements:

1. **Change the localhost URL**: Update the `url` property in the `localhostServer` object or use the port parameter
2. **Change the authentication method**: Modify the `securitySchemes` object or use the switch-auth-method.js script
3. **Change the API key value**: Update the `API_KEY_VALUE` constant in the script

## Troubleshooting

If you encounter issues:

1. **YAML parsing errors**: Check that your YAML files are valid
2. **File not found errors**: Ensure the script is run from the correct directory
3. **Authentication not updating**: Check that the security references are being properly updated

## Complete Workflow for Updating API Documentation

1. **Update OpenAPI files**: Make your changes to the YAML files in the `openapi` directory
2. **Add localhost server**: `node devscripts/add-localhost-server.js [port]`
3. **Choose authentication method**: `node devscripts/switch-auth-method.js [bearer|apikey]`
4. **Regenerate API docs**: `node generate-api-docs.js`
5. **Build the site**: `npm run build` or `pnpm run build`
6. **Test locally**: `npm run serve` or `pnpm run serve`

Alternatively, you can use the all-in-one script:

```bash
node devscripts/update-openapi-config.js
node generate-api-docs.js
npm run build
npm run serve
```

This workflow ensures that all OpenAPI files have consistent server and authentication configurations while preserving your specific API endpoint changes.
