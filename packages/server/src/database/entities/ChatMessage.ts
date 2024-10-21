/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { IChatMessage, MessageType } from '../../Interface'

@Entity()
export class ChatMessage implements IChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    role: MessageType

    @Index()
    @Column({ type: 'uuid' })
    chatflowid: string

    @Column({ type: 'text' })
    content: string

    @Column({ nullable: true, type: 'text' })
    sourceDocuments?: string

    @Column({ nullable: true, type: 'text' })
    usedTools?: string

    @Column({ nullable: true, type: 'text' })
    fileAnnotations?: string

    @Column({ nullable: true, type: 'text' })
    agentReasoning?: string

    @Column({ nullable: true, type: 'text' })
    fileUploads?: string

    @Column({ nullable: true, type: 'text' })
    artifacts?: string

    @Column({ nullable: true, type: 'text' })
    action?: string | null

    @Column()
    chatType: string

    @Column({ type: 'varchar' })
    chatId: string

    @Column({ nullable: true })
    memoryType?: string

    @Column({ type: 'varchar', nullable: true })
    sessionId?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ nullable: true, type: 'text' })
    leadEmail?: string

    @Column({ nullable: true, type: 'text' })
    followUpPrompts?: string
}
