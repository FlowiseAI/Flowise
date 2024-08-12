import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { IPaidPlan } from '../../Interface'

@Entity()
export class PaidPlan implements IPaidPlan {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    organizationId: string

    @Column({ type: 'float' })
    amount: number

    @Column()
    currency: string

    @Column({ type: 'integer', default: 0 })
    availableExecutions: number

    @Column({ type: 'integer', default: 0 })
    usedExecutions: number

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
