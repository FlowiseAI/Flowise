import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { IUsageEvent } from '../../Interface'

@Entity()
@Index(['organizationId', 'createdDate']) // For efficient org-level reporting
@Index(['entityType', 'entityId', 'createdDate']) // For efficient entity-level reporting
export class UsageEvent implements IUsageEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'varchar', length: 50 })
    entityType: 'user' | 'organization'

    @Index()
    @Column({ type: 'uuid' })
    entityId: string

    @Index()
    @Column({ type: 'uuid', nullable: true })
    organizationId: string

    @Column({ type: 'varchar', length: 50 })
    resourceType: 'AI_TOKENS' | 'COMPUTE'

    @Column({ type: 'integer' })
    quantity: number

    @Column({ type: 'integer' })
    creditsConsumed: number

    @Column({ nullable: true })
    stripeMeterEventId: string

    @Index()
    @Column({ nullable: true })
    traceId: string

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>

    @Column({ type: 'timestamp with time zone' })
    @CreateDateColumn()
    createdDate: Date
}
