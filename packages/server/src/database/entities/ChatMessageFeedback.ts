/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { ChatMessageRatingType, IChatMessageFeedback } from '../../Interface'

@Entity()
export class ChatMessageFeedback implements IChatMessageFeedback {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column()
    chatflowid: string

    @Column({ type: 'text' })
    content?: string

    @Column()
    chatId: string

    @Column()
    rating: ChatMessageRatingType

    @CreateDateColumn()
    createdDate: Date
}
