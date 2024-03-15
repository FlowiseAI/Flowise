/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm'
import { IVariable } from '../../Interface'

@Entity()
export class Variable implements IVariable {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column({ nullable: true, type: 'text' })
    value: string

    @Column({ default: 'string', type: 'text' })
    type: string

    @Column({type:'timestamp with time zone'})
    @CreateDateColumn()
    createdDate: Date

    @Column({type:'timestamp with time zone'})
    @UpdateDateColumn()
    updatedDate: Date
}
