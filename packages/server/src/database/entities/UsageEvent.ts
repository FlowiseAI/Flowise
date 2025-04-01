import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { IUsageEvent } from '../../Interface'

@Entity()
export class UsageEvent implements IUsageEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column()
    stripeCustomerId: string

    @Index()
    @Column({ type: 'uuid', nullable: true })
    userId: string

    @Index()
    @Column({ type: 'uuid', nullable: true })
    organizationId: string

    @Column({ type: 'varchar', length: 50 })
    resourceType: 'CREDITS'

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
