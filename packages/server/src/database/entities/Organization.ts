import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { IOrganization } from '../../Interface'

@Entity()
export class Organization implements IOrganization {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({})
    auth0Id: string

    @Column({ nullable: true })
    name: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Column({ type: 'uuid', nullable: true })
    currentPaidPlanId?: string

    @Column({ type: 'boolean', default: false })
    billingPoolEnabled?: boolean

    @Column({ nullable: true })
    stripeCustomerId?: string

    @Column({ type: 'jsonb', nullable: true })
    enabledIntegrations?: string
}
