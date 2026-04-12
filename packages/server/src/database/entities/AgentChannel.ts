import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'

@Entity('agent_channel')
export class AgentChannel {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index('IDX_agent_channel_chatflowid')
    @Column({ type: 'uuid' })
    chatflowId: string

    @Index('IDX_agent_channel_channelaccountid')
    @Column({ type: 'uuid' })
    channelAccountId: string

    @Index('IDX_agent_channel_provider')
    @Column({ type: 'varchar', length: 32 })
    provider: string

    @Index('IDX_agent_channel_webhookpath', { unique: true })
    @Column({ type: 'varchar', length: 255 })
    webhookPath: string

    @Column({ default: true })
    enabled?: boolean

    @Column({ nullable: false, type: 'text' })
    workspaceId: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
