import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm'
import { IChatFlowVersion } from '../../Interface'
import { ChatFlowMaster } from './ChatFlowMaster'

@Entity()
@Index(['masterId', 'version'], { unique: true }) // Ensure unique version numbers per master
@Index('IDX_chat_flow_version_active', ['masterId'], { where: '"isActive" = true' }) // Partial unique index for active version
export class ChatFlowVersion implements IChatFlowVersion {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'uuid' })
    @Index()
    masterId: string

    @ManyToOne(() => ChatFlowMaster, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'masterId' })
    master: ChatFlowMaster

    @Column({ type: 'integer' })
    version: number

    @Column({ type: 'boolean', default: false })
    isActive: boolean

    @Column({ type: 'text' })
    flowData: string

    @Column({ nullable: true })
    apikeyid?: string

    @Column({ nullable: true, type: 'text' })
    chatbotConfig?: string

    @Column({ nullable: true, type: 'text' })
    apiConfig?: string

    @Column({ nullable: true, type: 'text' })
    analytic?: string

    @Column({ nullable: true, type: 'text' })
    speechToText?: string

    @Column({ nullable: true, type: 'text' })
    textToSpeech?: string

    @Column({ nullable: true, type: 'text' })
    followUpPrompts?: string

    @Column({ nullable: true, type: 'text' })
    changeDescription?: string

    @Column({ nullable: true, type: 'integer' })
    sourceVersion?: number

    @Column({ nullable: true })
    createdBy?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
