/* eslint-disable */
import { Entity, Column, Index, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, DeleteDateColumn } from 'typeorm'
import { ChatflowType, IChatFlow } from '../../Interface'

export enum ChatflowVisibility {
    PRIVATE = 'Private',
    PUBLIC = 'Public',
    ORGANIZATION = 'Organization',
    ANSWERAI = 'AnswerAI',
    MARKETPLACE = 'Marketplace'
}

@Entity()
export class ChatFlow implements IChatFlow {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column({ nullable: true, type: 'text' })
    description?: string

    @Column({ type: 'text' })
    flowData: string

    @Column({ nullable: true })
    deployed?: boolean

    @Column({ nullable: true })
    isPublic?: boolean

    @Column({ nullable: true })
    apikeyid?: string

    @Column({ nullable: true, type: 'text' })
    chatbotConfig?: string

    @Column({
        type: 'simple-array',
        enum: ChatflowVisibility,
        default: 'Private'
    })
    visibility?: ChatflowVisibility[]

    @Column({ nullable: true, type: 'text' })
    answersConfig?: string

    @Column({ nullable: true, type: 'text' })
    apiConfig?: string

    @Column({ nullable: true, type: 'text' })
    analytic?: string

    @Column({ nullable: true, type: 'text' })
    speechToText?: string

    @Column({ nullable: true, type: 'text' })
    followUpPrompts?: string

    @Column({ nullable: true, type: 'text' })
    category?: string

    @Column({ nullable: true, type: 'text' })
    type?: ChatflowType

    @Index()
    @Column({ type: 'text', nullable: true })
    parentChatflowId?: string

    @Index()
    @Column({ type: 'uuid', nullable: true })
    userId: string

    @Index()
    @Column({ type: 'uuid', nullable: true })
    organizationId: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @DeleteDateColumn()
    deletedDate: Date
}
