/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'

export type EntityType = 'CHATFLOW' | 'ASSISTANT'

export interface IFlowHistory {
    id: string
    entityType: EntityType
    entityId: string
    snapshotData: string
    changeDescription?: string
    version: number
    createdDate: Date
    workspaceId?: string
}

@Entity()
@Index(['entityType', 'entityId', 'version'])
@Index(['entityType', 'entityId', 'createdDate'])
export class FlowHistory implements IFlowHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 20 })
    entityType: EntityType

    @Column({ type: 'uuid' })
    entityId: string

    @Column({ type: 'text' })
    snapshotData: string

    @Column({ nullable: true, type: 'text' })
    changeDescription?: string

    @Column({ type: 'int' })
    version: number

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ nullable: true, type: 'text' })
    workspaceId?: string
}