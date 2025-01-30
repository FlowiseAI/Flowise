# Database Schema Documentation

## Entities

### ActionRequest

The main entity for tracking human interaction requests.

```typescript
@Entity()
export class ActionRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    flowId: string

    @Column()
    sessionId: string

    @Column()
    nodeId: string

    @Column({
        type: 'enum',
        enum: ['pending', 'completed', 'expired', 'cancelled'],
        default: 'pending'
    })
    status: string

    @Column('simple-array')
    outputTypes: string[]  // ['chat', 'email', 'custom']

    @Column('json')
    context: {
        question: string
        metadata: any
    }

    @Column('json', { nullable: true })
    args?: {
        // For chat
        message?: string
        expectedResponse?: string[]

        // For email
        to?: string[]
        cc?: string[]
        bcc?: string[]
        bodyHTML?: string
        bodyText?: string
        attachments?: string[]

        // For custom
        [key: string]: any
    }

    @Column('json', { nullable: true })
    response?: {
        value: any
        respondedBy?: string
        timestamp: Date
    }

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @DeleteDateColumn()
    deletedAt?: Date

    // Relationships
    @ManyToOne(() => ChatFlow)
    flow: ChatFlow

    @Index(['flowId', 'status'])
    @Index(['sessionId', 'status'])
    @Index(['nodeId', 'status'])
}
```

### ActionWebhook

Entity for managing webhook subscriptions.

```typescript
@Entity()
export class ActionWebhook {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    url: string

    @Column('simple-array')
    events: string[]

    @Column({ nullable: true })
    secret?: string

    @Column({ default: true })
    active: boolean

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
```

### ActionAudit

Entity for tracking action history and changes.

```typescript
@Entity()
export class ActionAudit {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    actionId: string

    @Column()
    event: string

    @Column('json')
    data: any

    @Column({ nullable: true })
    userId?: string

    @CreateDateColumn()
    timestamp: Date

    // Relationships
    @ManyToOne(() => ActionRequest)
    action: ActionRequest
}
```

## Migrations

### Initial Migration

```typescript
export class CreateHILTables1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ActionRequest table
        await queryRunner.createTable(
            new Table({
                name: 'action_request',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid'
                    },
                    {
                        name: 'flow_id',
                        type: 'varchar'
                    },
                    // ... other columns
                ]
            })
        )

        // Create indices
        await queryRunner.createIndex(
            'action_request',
            new TableIndex({
                name: 'IDX_ACTION_FLOW_STATUS',
                columnNames: ['flow_id', 'status']
            })
        )

        // ... create other tables and indices
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order
        await queryRunner.dropTable('action_audit')
        await queryRunner.dropTable('action_webhook')
        await queryRunner.dropTable('action_request')
    }
}
```

## Database Design Considerations

### 1. Performance
- Simple schema focused on core functionality
- JSON columns for flexible output types
- Indices for common queries

### 2. Data Integrity
- Enum validation for status
- Required fields validation
- Soft deletes for data retention

### 3. Query Examples

#### 1. Get Pending Actions
```sql
SELECT * FROM action_request
WHERE status = 'pending'
AND flow_id = :flowId
ORDER BY created_at DESC;
```

#### 2. Get Actions by Type
```sql
SELECT * FROM action_request
WHERE :outputType = ANY(output_types)
AND status = 'pending'
ORDER BY created_at DESC;
```

#### 3. Get Action Details
```sql
SELECT ar.*
FROM action_request ar
WHERE ar.id = :actionId;
```

## State Management

The database schema supports the state management requirements of the HIL node:

```typescript
interface IHILState {
    pendingActionId: string
    outputTypes: string[]
    args?: any
}
```

## Data Lifecycle

1. Creation
   - Action request created with output types
   - Args structured based on types
   - Initial status set to 'pending'

2. Processing
   - External systems process based on type
   - Response recorded when received
   - Status updated accordingly

3. Completion
   - Response stored
   - Status marked as completed
   - Flow resumed with response 