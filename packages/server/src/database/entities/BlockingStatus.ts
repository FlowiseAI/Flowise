import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, Unique } from 'typeorm'
import { IBlockingStatus } from '../../Interface'

@Entity()
@Unique(['entityType', 'entityId']) // Ensure one blocking status per entity
export class BlockingStatus implements IBlockingStatus {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'varchar', length: 50 })
    entityType: 'user' | 'organization'

    @Index()
    @Column({ type: 'uuid' })
    entityId: string

    @Index()
    @Column({ type: 'uuid', nullable: true })
    organizationId: string

    @Column({ default: false })
    isBlocked: boolean

    @Column({ nullable: true })
    reason: string

    @Column({ type: 'timestamp with time zone' })
    @CreateDateColumn()
    createdDate: Date
}
