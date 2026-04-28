import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { Organization } from './organization.entity'
import { Role } from './role.entity'
import { User } from './user.entity'

export enum OrganizationUserStatus {
    ACTIVE = 'active',
    DISABLE = 'disable',
    INVITED = 'invited'
}

@Entity({ name: 'organization_user' })
export class OrganizationUser {
    @PrimaryColumn()
    organizationId: string
    @ManyToOne(() => Organization, (organization) => organization.id)
    @JoinColumn({ name: 'organizationId' })
    organization: Organization

    @PrimaryColumn()
    userId: string
    @ManyToOne(() => User, (user) => user.id)
    @JoinColumn({ name: 'userId' })
    user: User

    @Column({ type: 'uuid', nullable: false })
    roleId: string
    @ManyToOne(() => Role, (role) => role.id)
    @JoinColumn({ name: 'roleId' })
    role?: Role

    @Column({ type: 'varchar', length: 20, default: OrganizationUserStatus.ACTIVE })
    status?: string

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: false })
    createdBy?: string
    @ManyToOne(() => User, (user) => user.createdOrganizationUser)
    @JoinColumn({ name: 'createdBy' })
    createdByUser?: User

    @Column({ nullable: false })
    updatedBy?: string
    @ManyToOne(() => User, (user) => user.updatedOrganizationUser)
    @JoinColumn({ name: 'updatedBy' })
    updatedByUser?: User
}
