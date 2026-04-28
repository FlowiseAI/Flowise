import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Organization } from './organization.entity'
import { User } from './user.entity'

export enum GeneralRole {
    OWNER = 'owner',
    MEMBER = 'member',
    PERSONAL_WORKSPACE = 'personal workspace'
}

@Entity()
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ nullable: true })
    organizationId?: string
    @ManyToOne(() => Organization, (organization) => organization.id)
    @JoinColumn({ name: 'organizationId' })
    organization?: Organization

    @Column({ type: 'varchar', length: 100 })
    name: string

    @Column({ type: 'text', nullable: true })
    description?: string

    @Column({ type: 'text' })
    permissions: string

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: true })
    createdBy?: string
    @ManyToOne(() => User, (user) => user.createdRoles)
    @JoinColumn({ name: 'createdBy' })
    createdByUser?: User

    @Column({ nullable: true })
    updatedBy?: string
    @ManyToOne(() => User, (user) => user.updatedRoles)
    @JoinColumn({ name: 'updatedBy' })
    updatedByUser?: User
}
