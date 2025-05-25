import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ChatFlow } from './ChatFlow'

@Entity()
export class Trigger {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar' })
    name: string

    @Column({ type: 'varchar' })
    type: string // 'calendar', 'webhook', 'schedule', etc.

    @Column({ type: 'text', nullable: true })
    config: string // JSON string with trigger configuration

    @Column({ type: 'boolean', default: true })
    isActive: boolean

    @Column({ type: 'varchar', nullable: true })
    tenantId: string

    @Column({ type: 'varchar', nullable: true })
    chatflowId: string

    @ManyToOne(() => ChatFlow, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chatflowId' })
    chatflow: ChatFlow

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}