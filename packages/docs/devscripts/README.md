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

## Customization

To modify the scripts for different requirements:

1. **Change the localhost URL**: Update the `url` property in the `localhostServer` object
2. **Change the authentication method**: Modify the `securitySchemes` object
3. **Change the API key value**: Update the `API_KEY_VALUE` constant in the script

## Troubleshooting

If you encounter issues:

1. **YAML parsing errors**: Check that your YAML files are valid
2. **File not found errors**: Ensure the script is run from the correct directory
3. **Authentication not updating**: Check that the security references are being properly updated

## Complete Workflow for Updating API Documentation

1. **Update OpenAPI files**: Make your changes to the YAML files in the `openapi` directory
2. **Run the configuration script**: `node devscripts/update-openapi-config.js`
3. **Choose authentication method (optional)**: `node devscripts/switch-auth-method.js [bearer|apikey]`
4. **Regenerate API docs**: `node generate-api-docs.js`
5. **Build the site**: `npm run build` or `pnpm run build`
6. **Test locally**: `npm run serve` or `pnpm run serve`

This workflow ensures that all OpenAPI files have consistent server and authentication configurations while preserving your specific API endpoint changes.
