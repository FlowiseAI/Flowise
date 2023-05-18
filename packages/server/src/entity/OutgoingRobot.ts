/* eslint-disable */
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm'
import { IRobot } from '../Interface'

@Entity()
export class Robot implements IRobot {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column()
    chatflowid: string

    @Index()
    @Column({ nullable: true })
    token: string

    @Column({ nullable: true })
    webhook: string
}
