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
    @Column()
    chatflowid: string

    @Column({ type: 'text' })
    content: string

    @Column({ nullable: true, type: 'text' })
    sourceDocuments?: string

    @CreateDateColumn()
    createdDate: Date
}
