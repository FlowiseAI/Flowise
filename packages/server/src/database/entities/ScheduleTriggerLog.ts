/* eslint-disable */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm'
import { IScheduleTriggerLog } from '../../Interface'
import { ScheduleTriggerType } from './ScheduleRecord'

export enum ScheduleTriggerStatus {
    QUEUED = 'QUEUED',
    RUNNING = 'RUNNING',
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED',
    SKIPPED = 'SKIPPED'
}

@Entity()
export class ScheduleTriggerLog implements IScheduleTriggerLog {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'varchar' })
    scheduleRecordId: string

    @Column({ type: 'varchar', length: 32 })
    triggerType: ScheduleTriggerType

    @Index()
    @Column({ type: 'varchar' })
    targetId: string

    /** Resulting execution/chatMessage ID (for agentflow triggers) */
    @Column({ nullable: true, type: 'varchar' })
    executionId?: string

    @Column({ type: 'varchar', length: 32 })
    status: ScheduleTriggerStatus

    @Column({ nullable: true, type: 'text' })
    error?: string

    @Column({ nullable: true, type: 'integer' })
    elapsedTimeMs?: number

    @Column()
    scheduledAt: Date

    @Column({ type: 'varchar' })
    workspaceId: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date
}
