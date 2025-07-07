import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { IUser } from '../../Interface'

@Entity()
export class User implements IUser {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ unique: true })
    auth0Id: string

    @Column({ nullable: true })
    stripeCustomerId: string

    @Column()
    email: string

    @Column({ nullable: true })
    name: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Index()
    @Column({ type: 'uuid' })
    organizationId: string

    @Column({ type: 'uuid', nullable: true })
    trialPlanId?: string

    @Column({ type: 'uuid', nullable: true })
    defaultChatflowId?: string
}
