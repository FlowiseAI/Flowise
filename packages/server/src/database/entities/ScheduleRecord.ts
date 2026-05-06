/* eslint-disable */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { IScheduleRecord, ScheduleInputMode } from '../../Interface'

export enum ScheduleTriggerType {
    AGENTFLOW = 'AGENTFLOW'
}

@Entity()
export class ScheduleRecord implements IScheduleRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string

    /** Discriminator: which entity type is being scheduled */
    @Column({ type: 'varchar', length: 32 })
    triggerType: ScheduleTriggerType

    /** FK to the target entity (ChatFlow.id for AGENTFLOW) */
    @Index()
    @Column({ type: 'varchar' })
    targetId: string

    /** Node ID within the flow (for traceability) */
    @Column({ nullable: true, type: 'text' })
    nodeId?: string

    /** Standard 5 or 6 field cron expression */
    @Column({ type: 'text' })
    cronExpression: string

    /** IANA timezone string, e.g. "UTC" or "America/New_York" */
    @Column({ type: 'varchar', length: 64, default: 'UTC' })
    timezone: string

    /** Whether the schedule is active */
    @Column({ type: 'boolean', default: true })
    enabled: boolean

    @Column({ type: 'varchar', length: 16 })
    scheduleInputMode: ScheduleInputMode

    /** Optional static text sent as question when the flow fires (scheduleInputMode='text') */
    @Column({ nullable: true, type: 'text' })
    defaultInput?: string

    /** Optional JSON-serialized Record<string, any> passed as incomingInput.form (scheduleInputMode='form') */
    @Column({ nullable: true, type: 'text' })
    defaultForm?: string

    @Column({ nullable: true })
    lastRunAt?: Date

    @Column({ nullable: true })
    nextRunAt?: Date

    /** Optional date/time after which the schedule will no longer fire */
    @Column({ nullable: true })
    endDate?: Date

    @Column({ type: 'varchar' })
    workspaceId: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
