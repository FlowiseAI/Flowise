import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { IExecution, ExecutionState } from '../../Interface'
import { ChatFlow } from './ChatFlow'

@Entity()
export class Execution implements IExecution {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    executionData: string

    @Column()
    state: ExecutionState

    @Index()
    @Column({ type: 'uuid' })
    agentflowId: string

    @Index()
    @Column({ type: 'uuid' })
    sessionId: string

    @Column({ nullable: true, type: 'text' })
    action?: string

    @Column({ nullable: true })
    isPublic?: boolean

    @Index()
    @Column({ type: 'uuid', nullable: true })
    userId: string

    @Index()
    @Column({ type: 'uuid', nullable: true })
    organizationId: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Column()
    stoppedDate: Date

    @ManyToOne(() => ChatFlow)
    @JoinColumn({ name: 'agentflowId' })
    agentflow: ChatFlow
}
