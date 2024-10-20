/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm'
import { IAssistant } from '../../Interface'

@Entity()
export class Assistant implements IAssistant {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    details: string

    @Column({ type: 'uuid' })
    credential: string

    @Column({ nullable: true })
    iconSrc?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
