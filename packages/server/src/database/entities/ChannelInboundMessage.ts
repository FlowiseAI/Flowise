import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, Unique } from 'typeorm'

@Entity('channel_inbound_message')
@Unique('UQ_channel_inbound_message_provider_account_external', ['provider', 'channelAccountId', 'externalMessageId'])
export class ChannelInboundMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index('IDX_channel_inbound_message_provider')
    @Column({ type: 'varchar', length: 32 })
    provider: string

    @Index('IDX_channel_inbound_message_channelaccountid')
    @Column({ type: 'uuid' })
    channelAccountId: string

    @Column({ type: 'varchar', length: 255 })
    externalMessageId: string

    @CreateDateColumn()
    createdDate: Date
}
