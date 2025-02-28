import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { IApiKey, IApiKeyMetadata } from '../../Interface'

@Entity('apikey')
export class ApiKey implements IApiKey {
    @PrimaryColumn({ type: 'varchar', length: 20 })
    id: string

    @Column({ type: 'text' })
    apiKey: string

    @Column({ type: 'text' })
    apiSecret: string

    @Column({ type: 'text' })
    keyName: string

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Column({ type: 'uuid' })
    organizationId: string

    @Column({ type: 'uuid' })
    userId: string

    @Column({ nullable: true })
    lastUsedAt: Date

    @Column({ type: 'boolean', default: true })
    isActive: boolean

    @Column({ type: 'simple-json', nullable: true })
    metadata: IApiKeyMetadata
}
