import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { ITrialPlan } from '../../Interface'

@Entity()
export class TrialPlan implements ITrialPlan {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    userId: string

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
