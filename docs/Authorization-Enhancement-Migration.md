# Authorization Enhancement Migration Plan

## Implementation Status

### ✅ Stage 1: Database Migration (Completed)

-   Added new fields to ApiKey entity
-   Created and implemented migration script
-   Updated interfaces and types

### ✅ Stage 2: Authentication Enhancement (Completed)

-   Enhanced API key service with new functionality
-   Updated authentication middleware
-   Added user context with API key support

### 🔄 Stage 3: API Endpoints (In Progress)

-   Basic endpoints implemented
-   Advanced features pending

## Implemented Changes

### Stage 1: Database Migration

#### Entity Update

```typescript
// packages/server/src/database/entities/ApiKey.ts

@Entity('apikey')
export class ApiKey implements IApiKey {
    @PrimaryColumn({ type: 'varchar', length: 20 })
    id: string

    @Column({ type: 'text' })
    apiKey: string

    @Column({ type: 'text' })
    apiSecret: string

    @Column({ type: 'text' })
    keyName: string

    @Column({ nullable: true })
    lastUsedAt: Date

    @Column({ type: 'boolean', default: true })
    isActive: boolean

    @Column({ type: 'simple-json', nullable: true })
    metadata: IApiKeyMetadata

    @Column({ type: 'uuid' })
    organizationId: string

    @Column({ type: 'uuid' })
    userId: string
}
```

#### Migration Script

```typescript
// packages/server/src/database/migrations/postgres/1720230151481-ApiKeyEnhancement.ts

export class ApiKeyEnhancement1720230151481 implements MigrationInterface {
    name = 'ApiKeyEnhancement1720230151481'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "apikey" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP')
        await queryRunner.query('ALTER TABLE "apikey" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true')
        await queryRunner.query('ALTER TABLE "apikey" ADD COLUMN IF NOT EXISTS "metadata" JSONB')
        await queryRunner.query('UPDATE "apikey" SET "lastUsedAt" = NOW(), "metadata" = \'{}\' WHERE "lastUsedAt" IS NULL')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "apikey" DROP COLUMN IF EXISTS "metadata"')
        await queryRunner.query('ALTER TABLE "apikey" DROP COLUMN IF EXISTS "isActive"')
        await queryRunner.query('ALTER TABLE "apikey" DROP COLUMN IF EXISTS "lastUsedAt"')
    }
}
```

### Stage 2: Authentication Enhancement

#### API Key Service Update

```typescript
// packages/server/src/services/apikey/index.ts

const verifyApiKey = async (paramApiKey: string): Promise<ApiKey | null> => {
    try {
        if (_apikeysStoredInJson()) {
            const apiKeyData = await getApiKey_json(paramApiKey)
            if (!apiKeyData) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
            }
            // Convert JSON data to ApiKey entity
            const apiKey = new ApiKey()
            Object.assign(apiKey, apiKeyData)
            return apiKey
        } else if (_apikeysStoredInDb()) {
            const appServer = getRunningExpressApp()
            const apiKey = await appServer.AppDataSource.getRepository(ApiKey).findOneBy({
                apiKey: paramApiKey,
                isActive: true
            })
            if (!apiKey) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
            }
            // Update lastUsedAt
            apiKey.lastUsedAt = new Date()
            await appServer.AppDataSource.getRepository(ApiKey).save(apiKey)
            return apiKey
        }
        return null
    } catch (error) {
        if (error instanceof InternalFlowiseError && error.statusCode === StatusCodes.UNAUTHORIZED) {
            throw error
        }
        return null
    }
}
```

#### Authentication Middleware Update

```typescript
// packages/server/src/middlewares/authentication/index.ts

const tryApiKeyAuth = async (req: Request, AppDataSource: DataSource): Promise<User | null> => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return null

    const apiKey = authHeader.split(' ')[1]
    try {
        const apiKeyData = await apikeyService.verifyApiKey(apiKey)
        if (!apiKeyData) return null

        // Get user from API key's userId
        const user = await AppDataSource.getRepository(User).findOne({
            where: { id: apiKeyData.userId },
            relations: ['organization']
        })

        if (!user) return null

        // Add API key metadata to user context
        const userWithApiKey = user as User
        userWithApiKey.apiKey = {
            id: apiKeyData.id,
            metadata: apiKeyData.metadata
        }
        return userWithApiKey
    } catch (error) {
        return null
    }
}
```

### Stage 3: Interface Updates

```typescript
// packages/server/src/Interface.ts

export interface IApiKeyMetadata {
    createdBy?: string
    allowedScopes?: string[]
    description?: string
}

export interface IUser {
    // ... existing fields ...
    apiKey?: {
        id: string
        metadata?: IApiKeyMetadata
    }
}

export interface IApiKey {
    id: string
    keyName: string
    apiKey: string
    apiSecret: string
    updatedDate: Date
    organizationId: string
    userId: string
    lastUsedAt?: Date
    isActive: boolean
    metadata?: IApiKeyMetadata
}
```

## Next Steps

1. Complete Stage 3:

    - Implement key rotation functionality
    - Add metadata management endpoints
    - Enhance API key management UI

2. Testing:

    - Write unit tests for completed functionality
    - Add integration tests
    - Perform security testing

3. Documentation:
    - Update API documentation
    - Create migration guide
    - Document security best practices

## Rollback Procedures

### Database Rollback

1. Execute migration down script:

```sql
ALTER TABLE "apikey" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "apikey" DROP COLUMN IF EXISTS "isActive";
ALTER TABLE "apikey" DROP COLUMN IF EXISTS "lastUsedAt";
```

### Code Rollback

1. Revert middleware changes
2. Restore original service implementations
3. Remove new endpoints

## Testing Checklist

### Unit Tests

-   [ ] API key validation
-   [ ] User context extraction
-   [ ] Database operations
-   [ ] Service methods

### Integration Tests

-   [ ] Authentication flow
-   [ ] API endpoints
-   [ ] Migration process
-   [ ] Rollback procedures

### Security Tests

-   [ ] Key validation
-   [ ] Permission checks
-   [ ] Error handling
-   [ ] Rate limiting
