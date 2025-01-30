/* eslint-disable */
import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm'
import { IActionRequest } from '../../../../components/src/Interface'

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

    @Column('simple-json')
    output_types: string[]

    @Column('simple-json')
    context: {
        question: string
        metadata: any
    }

    @Column('simple-json', { nullable: true })
    args?: Record<string, any>

    @Column('simple-json', { nullable: true })
    response?: Record<string, any>

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date

    @DeleteDateColumn()
    deleted_at?: Date | null
} 