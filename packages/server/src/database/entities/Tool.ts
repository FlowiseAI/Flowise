/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { ITool } from '../../Interface'

export enum ToolVisibility {
    PRIVATE = 'Private',
    ORGANIZATION = 'Organization'
}

@Entity()
export class Tool implements ITool {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column({ type: 'text' })
    description: string

    @Column()
    color: string

    @Column({ nullable: true })
    iconSrc?: string

    @Column({ nullable: true, type: 'text' })
    schema?: string

    @Column({ nullable: true, type: 'text' })
    func?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Index()
    @Column({ type: 'uuid', nullable: true })
    userId?: string

    @Index()
    @Column({ type: 'uuid', nullable: true })
    organizationId?: string

    @Column({
        type: 'simple-array',
        enum: ToolVisibility,
        default: 'Private'
    })
    visibility?: ToolVisibility[]
}
