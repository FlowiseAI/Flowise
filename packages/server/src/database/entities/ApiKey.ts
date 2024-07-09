import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { IApiKey } from '../../Interface'

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
}
