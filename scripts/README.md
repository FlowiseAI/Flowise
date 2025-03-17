# TheAnswer Scripts

This directory contains utility scripts for the TheAnswer project.

## OpenAPI Documentation Sync

The `sync-openapi-docs.js` script synchronizes individual OpenAPI YAML files in the `packages/docs/openapi/` directory with the comprehensive Swagger file in `packages/api-documentation/src/yml/swagger.yml`.

### Features

-   Automatically identifies routes in the main swagger.yml that belong to each individual API file based on tags
-   Updates paths, parameters, request bodies, and responses in individual files to match the main swagger
-   Extracts and updates referenced schemas in the components section
-   Preserves the structure and formatting of individual files
-   Generates a detailed log of changes made to each file

### Usage

You can run the script in two ways:

#### Using the shell script (recommended)

```bash
./sync-openapi.sh
```

This script will:

1. Change to the scripts directory
2. Install dependencies if needed
3. Run the sync script

#### Manually

```bash
cd scripts
npm install
npm run sync-openapi
```

### Output

The script will output changes made to each file, for example:

```
Starting OpenAPI documentation synchronization...
📝 Changes for prediction.yaml:
  - Update requestBody for POST /prediction/{id}
  - Update schema: Document
✅ No changes needed for tools.yaml
...
Synchronization complete!
```

### How It Works

1. Reads the main swagger.yml file
2. For each individual YAML file in packages/docs/openapi:
    - Determines which paths in the main swagger correspond to the API (based on tags)
    - Compares and updates paths, operations, parameters, etc.
    - Extracts and updates referenced components
    - Writes the updated YAML if changes were detected

### Maintaining API Documentation

1. Make changes to the main swagger.yml file
2. Run this script to propagate those changes to individual files
3. Commit both the changes to swagger.yml and the updated individual files

This ensures the consistency of API documentation across the codebase.
