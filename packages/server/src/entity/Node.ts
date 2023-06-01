/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm'
import { INodeColumn } from '../Interface'

@Entity()
export class Node implements INodeColumn {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column()
    label: string

    @Column({ nullable: true })
    type: string

    @Column()
    category: string

    @Column()
    description: string

    @Column()
    baseClasses: string

    @Column({ nullable: true })
    filePath: string

    @Column({ nullable: true })
    icon: string

    @Column()
    inputs: string

    @Column()
    outputs: string
}
