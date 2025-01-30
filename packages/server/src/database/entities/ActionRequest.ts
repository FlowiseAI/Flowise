/* eslint-disable */
import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm'
import { IActionRequest } from '../../Interface'

export type ActionRequestStatus = 'pending' | 'completed' | 'expired' | 'cancelled'

@Entity()
export class ActionRequest implements IActionRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    flow_id: string

    @Index()
    @Column()
    session_id: string

    @Index()
    @Column()
    node_id: string

    @Index()
    @Column({
        type: 'enum',
        enum: ['pending', 'completed', 'expired', 'cancelled'],
        default: 'pending'
    })
    status: ActionRequestStatus

    @Column({ type: 'simple-json' })
    output_types: string[]

    @Column({ type: 'simple-json' })
    context: Record<string, any>

    @Column({ type: 'simple-json', nullable: true })
    args?: Record<string, any>

    @Column({ type: 'simple-json', nullable: true })
    response?: Record<string, any>

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updated_at: Date

    @DeleteDateColumn({ name: 'deleted_at' })
    deleted_at?: Date
} 