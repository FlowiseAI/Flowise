import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Trigger } from './Trigger'

@Entity()
export class TriggerEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar' })
    triggerId: string

    @ManyToOne(() => Trigger, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'triggerId' })
    trigger: Trigger

    @Column({ type: 'text', nullable: true })
    payload: string // JSON string with event payload

    @Column({ type: 'varchar', nullable: true })
    status: string // 'pending', 'processing', 'completed', 'failed'

    @Column({ type: 'text', nullable: true })
    result: string // JSON string with execution result

    @Column({ type: 'varchar', nullable: true })
    error: string

    @CreateDateColumn()
    createdDate: Date
}