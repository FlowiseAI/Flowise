import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { User } from './user.entity'

export enum OrganizationName {
    DEFAULT_ORGANIZATION = 'Default Organization'
}

export enum OrganizationStatus {
    ACTIVE = 'active',
    UNDER_REVIEW = 'under_review',
    PAST_DUE = 'past_due'
}

@Entity()
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 100, default: OrganizationName.DEFAULT_ORGANIZATION })
    name: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    customerId?: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    subscriptionId?: string

    @Column({ type: 'varchar', length: 20, default: OrganizationStatus.ACTIVE })
    status: string

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: false })
    createdBy?: string
    @ManyToOne(() => User, (user) => user.createdOrganizations)
    @JoinColumn({ name: 'createdBy' })
    createdByUser?: User

    @Column({ nullable: false })
    updatedBy?: string
    @ManyToOne(() => User, (user) => user.updatedOrganizations)
    @JoinColumn({ name: 'updatedBy' })
    updatedByUser?: User
}
