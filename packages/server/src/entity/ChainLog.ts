/* eslint-disable */
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { IChainLog } from '../Interface'

@Entity()
export class ChainLog implements IChainLog {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @CreateDateColumn()
    createdDate: Date

    @Column()
    question: string

    @Column()
    text: string

    @Column()
    chatId: string

    @Column()
    isInternal: boolean

    @Column()
    chatflowId: string

    @Column()
    chatflowName: string

    @Column({ type: 'simple-json' })
    result: JSON
}
