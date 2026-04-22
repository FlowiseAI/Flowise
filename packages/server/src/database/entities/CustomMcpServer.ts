/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm'
import { ICustomMcpServer } from '../../Interface'

@Entity()
export class CustomMcpServer implements ICustomMcpServer {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column({ type: 'text' })
    serverUrl: string

    @Column({ nullable: true })
    iconSrc?: string

    @Column({ nullable: true })
    color?: string

    @Column({ default: 'NONE' })
    authType: string

    @Column({ nullable: true, type: 'text' })
    authConfig?: string

    @Column({ nullable: true, type: 'text', select: false })
    tools?: string

    @Column({ type: 'int', default: 0 })
    toolCount: number

    @Column({ default: 'PENDING' })
    status: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Column({ nullable: false, type: 'text' })
    workspaceId: string
}
