/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { ChatType, IChatMessage, MessageType } from '../Interface'

@Entity()
export class ChatMessage implements IChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    chatType: ChatType

    @Column()
    role: MessageType

    @Index()
    @Column()
    chatflowid: string

    @Column({ type: 'text' })
    content: string

    @Column({ nullable: true })
    sourceDocuments?: string

    @Column({ nullable: true })
    chatId?: string

    @Column({ nullable: true })
    memoryType?: string

    @Column({ nullable: true })
    sessionId?: string

    @CreateDateColumn()
    createdDate: Date
}
