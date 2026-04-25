/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm'
import { ISkill } from '../../Interface'

@Entity()
export class Skill implements ISkill {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column({ type: 'text' })
    description: string

    @Column({ type: 'text' })
    markdown: string

    @Column({ nullable: true, type: 'text' })
    inputSchema?: string

    @Column({ nullable: true })
    color?: string

    @Column({ nullable: true })
    iconSrc?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Column({ nullable: false, type: 'text' })
    workspaceId: string
}
