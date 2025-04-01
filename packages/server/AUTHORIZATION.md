# Authorization in Flowise

## Overview

Flowise implements a multi-layered authentication and authorization system:

1. Auth0 JWT Authentication
2. API Key Authentication
3. Resource-Level Access Control

## Authentication Methods

### 1. API Key Authentication (Primary)

API Keys are now the primary authentication method for all API endpoints. They provide:

-   Service-to-service authentication
-   User context association
-   Organization scoping
-   Usage tracking
-   Activity status control

#### Configuration

```env
APIKEY_STORAGE_TYPE=db  # or 'json'
```

#### Structure

```typescript
interface IApiKey {
    id: string
    keyName: string
    apiKey: string
    apiSecret: string
    organizationId: string
    userId: string
    lastUsedAt?: Date
    isActive: boolean
    metadata?: IApiKeyMetadata
}

interface IApiKeyMetadata {
    createdBy?: string
    allowedScopes?: string[]
    description?: string
}
```

### 2. JWT Authentication (Secondary)

JWT Authentication via Auth0 serves as a fallback mechanism and is primarily used for:

-   User interface access
-   Interactive sessions
-   Organization-based access control

#### Configuration

```env
AUTH0_SECRET=your-auth0-secret
AUTH0_AUDIENCE=your-auth0-audience
AUTH0_ISSUER_BASE_URL=your-auth0-issuer-url
AUTH0_TOKEN_SIGN_ALG=RS256
AUTH0_ORGANIZATION_ID=your-org-id
```

## Resource Protection

### 1. API Endpoint Protection

All `/api/v1/` endpoints are protected by the authentication middleware which:

1. **Checks API Key First**

    ```typescript
    // Authorization: Bearer <api-key>
    const apiKeyUser = await tryApiKeyAuth(req, AppDataSource)
    if (apiKeyUser) {
        req.user = apiKeyUser
        return next()
    }
    ```

2. **Falls Back to JWT**

    - Validates JWT token
    - Checks organization membership
    - Synchronizes user data

3. **Whitelist Exceptions**
    - Some endpoints can bypass authentication
    - Configured via `whitelistURLs`

### 2. User Context Security

When authenticated, requests receive a user context that includes:

```typescript
interface IUser {
    id: string
    name: string
    email: string
    organizationId: string
    permissions?: string[]
    roles?: string[]
    apiKey?: {
        id: string
        metadata?: IApiKeyMetadata
    }
}
```

### 3. Organization-Level Isolation

Resources are isolated at the organization level:

-   API keys are scoped to organizations
-   Users are associated with organizations
-   JWT tokens include organization validation

### 4. API Key Management

Protected endpoints for API key management:

```typescript
GET    /api/v1/apikeys          // List organization's API keys
POST   /api/v1/apikeys          // Create new API key
PUT    /api/v1/apikeys/:id      // Update API key
DELETE /api/v1/apikeys/:id      // Delete API key
GET    /api/v1/apikeys/verify   // Verify API key
```

### 5. Access Control Features

1. **API Key Status**

    - Active/Inactive state control
    - Last used tracking
    - Metadata for additional context

2. **Organization Validation**

    - JWT organization matching
    - API key organization scoping
    - Resource ownership verification

3. **User Association**
    - API keys linked to specific users
    - User context maintained across auth methods
    - Permission inheritance

## Security Implementation

### 1. Authentication Flow

```typescript
// 1. Extract authentication header
const authHeader = req.headers.authorization
if (!authHeader?.startsWith('Bearer ')) return null

// 2. Try API key authentication
const apiKey = authHeader.split(' ')[1]
const apiKeyData = await apikeyService.verifyApiKey(apiKey)

// 3. Verify active status and update usage
if (apiKeyData && apiKeyData.isActive) {
    apiKeyData.lastUsedAt = new Date()
    // Update and attach user context
}

// 4. Fallback to JWT if needed
if (!apiKeyData) {
    // JWT validation and user context
}
```

### 2. Database Security

```sql
-- API Key Table with Security Features
CREATE TABLE "apikey" (
    "id" VARCHAR(20) PRIMARY KEY,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "keyName" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lastUsedAt" TIMESTAMP,
    "isActive" BOOLEAN DEFAULT true,
    "metadata" JSONB,
    CONSTRAINT "fk_organization" FOREIGN KEY ("organizationId")
        REFERENCES "organization" ("id"),
    CONSTRAINT "fk_user" FOREIGN KEY ("userId")
        REFERENCES "user" ("id")
);
```

## Error Handling

1. **Authentication Errors (401)**

    - Invalid/expired API key
    - Invalid JWT token
    - Organization mismatch

2. **Authorization Errors (403)**

    - Insufficient permissions
    - Inactive API key
    - Resource access denied

3. **Validation Errors (400)**
    - Missing required fields
    - Invalid request format
    - Malformed authentication headers

## Best Practices

### 1. API Key Usage

-   Generate unique keys per service/integration
-   Regularly rotate keys
-   Monitor usage patterns
-   Implement key expiration
-   Use metadata for tracking purpose/scope

### 2. JWT Implementation

-   Validate organization context
-   Implement proper token refresh
-   Use secure cookie storage
-   Enable rate limiting

### 3. Resource Access

-   Always verify organization ownership
-   Implement principle of least privilege
-   Log access attempts
-   Regular security audits

## Migration Guide

1. **Database Updates**

    ```bash
    # Run migration
    pnpm typeorm:migration-run
    ```

2. **API Key Updates**

    - Update existing keys with new fields
    - Set default active status
    - Initialize metadata

3. **Authentication Updates**

    - Update clients to use new auth headers
    - Update error handling
    - Test both auth methods

4. **Verification**
    - Test resource access
    - Verify organization isolation
    - Check user context
    - Validate error responses
