# OpenAPI Documentation

This directory contains OpenAPI specification files for the AnswerAI API documentation.

## Directory Structure

-   `hello-world/` - Contains the Hello World API specification
    -   `hello-world.yaml` - OpenAPI specification for the Hello World API

## How to Generate API Documentation

To generate the API documentation, run:

```bash
npm run api-docs
```

This will:

1. Clean any existing API documentation
2. Generate new API documentation based on the OpenAPI specifications

## Adding a New API

To add a new API:

1. Create a new directory under `openapi/` for your API
2. Add your OpenAPI specification file (YAML or JSON)
3. Update the `docusaurus.config.ts` file to include your new API
4. Update the `sidebars.ts` file to include your new API in the sidebar
5. Run `npm run api-docs` to generate the documentation

## Resources

-   [Docusaurus OpenAPI Docs Plugin](https://github.com/PaloAltoNetworks/docusaurus-openapi-docs)
-   [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
