import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'

@Entity('channel_account')
export class ChannelAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Index('IDX_channel_account_provider')
    @Column({ type: 'varchar', length: 32 })
    provider: string

    @Column({ type: 'uuid' })
    credentialId: string

    @Column({ nullable: true, type: 'text' })
    config?: string

    @Column({ default: true })
    enabled?: boolean

    @Column({ nullable: false, type: 'text' })
    workspaceId: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
