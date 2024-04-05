/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, Unique } from 'typeorm'
import { IChatMessageFeedback, ChatMessageRatingType } from '../../Interface'

@Entity()
@Unique(['messageId'])
export class ChatMessageFeedback implements IChatMessageFeedback {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    chatflowid: string

    @Index()
    @Column({ type: 'varchar' })
    chatId: string

    @Column({ type: 'uuid' })
    messageId: string

    @Column({ nullable: true })
    rating: ChatMessageRatingType

    @Column({ nullable: true, type: 'text' })
    content?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date
}
