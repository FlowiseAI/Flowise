# Flowise Authentication Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication Methods](#authentication-methods)
3. [Implementation Files](#implementation-files)
4. [Authentication Flow](#authentication-flow)
5. [Access Control](#access-control)
6. [API Routes](#api-routes)
7. [Security Best Practices](#security-best-practices)
8. [Configuration](#configuration)
9. [Development Guide](#development-guide)

## Overview

The Flowise application implements a multi-layered authentication system that combines:

1. Auth0 JWT Authentication (Primary Method)
2. API Key Authentication (For Programmatic Access)
3. Basic Authentication (Optional Server-wide)
4. Role-Based Access Control (RBAC)

## Implementation Files

### Core Authentication Files

1. **Main Authentication Handler**

    - File: `packages/server/src/middlewares/authentication/index.ts`
    - Purpose: Handles JWT validation and user synchronization
    - Implements organization validation

2. **API Key Management**

    - Core: `packages/server/src/utils/apiKey.ts`
    - Service: `packages/server/src/services/apikey/index.ts`
    - Controller: `packages/server/src/controllers/apikey/index.ts`

3. **Ownership Validation**

    - File: `packages/server/src/utils/checkOwnership.ts`
    - Purpose: Handles resource access control

4. **Key Validation**
    - File: `packages/server/src/utils/validateKey.ts`
    - Purpose: Implements API key validation logic

## Authentication Methods

### 1. Auth0 JWT Authentication

The primary authentication method uses Auth0 with JWT tokens.

**Implementation Location**: `packages/server/src/middlewares/authentication/index.ts`

```typescript
const jwtCheck = auth({
    authRequired: true,
    secret: process.env.AUTH0_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: process.env.AUTH0_TOKEN_SIGN_ALG
})
```

**Key Features:**

-   JWT token validation
-   Organization-based access control
-   User synchronization with local database
-   Role-based permissions
-   Cookie-based token persistence

### 2. API Key Authentication

**Implementation Location**: `packages/server/src/utils/apiKey.ts`

```typescript
export const compareKeys = (storedKey: string, suppliedKey: string): boolean => {
    const [hashedPassword, salt] = storedKey.split('.')
    const buffer = scryptSync(suppliedKey, salt, 64) as Buffer
    return timingSafeEqual(Buffer.from(hashedPassword, 'hex'), buffer)
}
```

**Key Components:**

-   API key validation through `validateKey.ts`
-   Bearer token format in Authorization header
-   Per-chatflow API key binding
-   API key storage options:
    -   Database storage
    -   JSON file storage

### 3. Basic Authentication

**Implementation Location**: `packages/server/src/index.ts`

```typescript
if (process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD) {
    const basicAuthMiddleware = basicAuth({
        users: { [username]: password }
    })
}
```

## Authentication Flow

### 1. Request Processing

**Implementation Location**: `packages/server/src/middlewares/authentication/index.ts`

```typescript
// Authentication order:
1. Check for whitelisted URLs
2. Validate JWT token if present
3. Check API key if applicable
4. Verify organization access
5. Synchronize user data
```

### 2. User Context

```typescript
interface IUser {
    id: string
    auth0Id: string
    email: string
    name?: string
    organizationId?: string
    roles?: string[]
    permissions?: string[]
}
```

## Access Control

### 1. Resource Ownership

**Implementation Location**: `packages/server/src/utils/checkOwnership.ts`

```typescript
const checkOwnership = async (entryOrArray: any, user: IUser, req?: Request) => {
    // Checks:
    1. API key validation
    2. Organization management permissions
    3. Direct ownership
    4. Organization visibility
}
```

### 2. Role-Based Access Control

**Implementation Location**: `packages/server/src/middlewares/authentication/index.ts`

```typescript
const enforceAbility = (resourceName: string) => {
    // Enforces:
    1. Admin access to all organization resources
    2. User access to owned resources
    3. Resource-specific permissions
}
```

## API Routes

### Protected Resources Matrix

| Resource Type  | Auth Method | Implementation File         |
| -------------- | ----------- | --------------------------- |
| Authentication | Public      | `src/routes/auth.ts`        |
| Chatflows      | Mixed       | `src/routes/chatflow.ts`    |
| Credentials    | JWT Only    | `src/routes/credentials.ts` |
| Tools          | JWT Only    | `src/routes/tools.ts`       |
| Variables      | JWT Only    | `src/routes/variables.ts`   |
| Predictions    | Mixed       | `src/routes/predictions.ts` |
| Chat Messages  | JWT Only    | `src/routes/messages.ts`    |
| Vectors        | Mixed       | `src/routes/vectors.ts`     |

### Public Endpoints

**Implementation Location**: `packages/server/src/index.ts`

```typescript
const whitelistURLs = [
    '/api/v1/google-auth',
    '/api/v1/verify/apikey/',
    '/api/v1/chatflows/apikey/',
    '/api/v1/public-chatflows',
    '/api/v1/prediction/',
    '/api/v1/vector/upsert/',
    '/api/v1/node-icon/',
    '/api/v1/components-credentials-icon/',
    '/api/v1/chatflows-streaming',
    '/api/v1/chatflows-uploads',
    '/api/v1/openai-assistants-file/download',
    '/api/v1/feedback',
    '/api/v1/leads',
    '/api/v1/get-upload-file',
    '/api/v1/ip',
    '/api/v1/ping',
    '/api/v1/marketplaces/templates'
]
```

## Security Best Practices

### 1. Token Management

**Implementation Location**: `packages-answers/ui/src/authOptions.ts`

```typescript
export const authOptions: AuthOptions = {
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60 // 24 hours
    }
}
```

### 2. API Key Security

-   Encrypted storage with salt
-   Per-chatflow scoping
-   Bearer token format
-   Secure comparison using `timingSafeEqual`

### 3. Organization Isolation

-   Resource separation by organization
-   Organization-specific API keys
-   Cross-organization access prevention

## Configuration

### Required Environment Variables

```env
# Auth0 Configuration
AUTH0_SECRET=
AUTH0_AUDIENCE=
AUTH0_ISSUER_BASE_URL=
AUTH0_TOKEN_SIGN_ALG=

# Basic Authentication
FLOWISE_USERNAME=
FLOWISE_PASSWORD=

# API Key Configuration
APIKEY_STORAGE_TYPE=
```

### Optional Environment Variables

```env
# Session Configuration
SESSION_SECRET=theanswerai

# CORS and Security
CORS_ORIGINS=
IFRAME_ORIGINS=

# Rate Limiting
NUMBER_OF_PROXIES=
```

## Development Guide

### Adding New Protected Resources

1. Create route in appropriate file under `src/routes/`
2. Apply authentication middleware:
    ```typescript
    router.use(authenticationHandlerMiddleware)
    ```
3. Implement ownership checks:
    ```typescript
    const isOwner = await checkOwnership(resource, req.user)
    ```
4. Add appropriate error handling

### Implementing API Key Authentication

1. Generate API key:
    ```typescript
    const apiKey = await generateAPIKey()
    ```
2. Store encrypted key:
    ```typescript
    await addAPIKey(keyName, apiKey)
    ```
3. Implement validation:
    ```typescript
    const isValid = await validateKey(req, resource)
    ```

### Security Headers

The application sets the following security headers:

-   Content-Security-Policy for iframe protection
-   Disabled X-Powered-By header
-   Secure cookie settings
-   CORS headers based on configuration

For more detailed implementation guidelines or specific use cases, refer to the corresponding implementation files listed in this documentation.
