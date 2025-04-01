import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, Unique } from 'typeorm'
import { ISubscription } from '../../Interface'

@Entity()
@Unique(['entityType', 'entityId']) // Ensure one active subscription per entity
export class Subscription implements ISubscription {
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
    subscriptionType: 'FREE' | 'PAID' | 'ENTERPRISE'

    @Column({ unique: true })
    stripeSubscriptionId: string

    @Column({ unique: true })
    stripeSubscriptionItemId: string

    @Column()
    status: string

    @Column({ type: 'integer' })
    creditsLimit: number

    @Column({ type: 'timestamp with time zone' })
    currentPeriodStart: Date

    @Column({ type: 'timestamp with time zone' })
    currentPeriodEnd: Date

    @Column({ type: 'timestamp with time zone' })
    @CreateDateColumn()
    createdDate: Date
}
