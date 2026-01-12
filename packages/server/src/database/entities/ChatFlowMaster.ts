/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { ChatflowType, IChatFlowMaster } from '../../Interface'
import { EnumChatflowType } from './ChatFlow'

@Entity()
export class ChatFlowMaster implements IChatFlowMaster {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    @Index()
    name: string

    @Column({ type: 'varchar', length: 20, default: EnumChatflowType.CHATFLOW })
    type?: ChatflowType

    @Column({ type: 'text' })
    @Index()
    workspaceId: string

    @Column({ nullable: true, type: 'text' })
    category?: string

    @Column({ nullable: true })
    isPublic?: boolean

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
