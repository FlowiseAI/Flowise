/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, Unique } from 'typeorm'
import { IChatMessageFeedback, ChatMessageRatingType } from '../../Interface'

@Entity()
@Unique(['messageId'])
export class ChatMessageFeedback implements IChatMessageFeedback {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column()
    chatflowid: string

    @Index()
    @Column()
    chatId: string

    @Column()
    messageId: string

    @Column({ nullable: true })
    rating: ChatMessageRatingType

    @Column({ nullable: true, type: 'text' })
    content?: string

    @CreateDateColumn()
    createdDate: Date
}
