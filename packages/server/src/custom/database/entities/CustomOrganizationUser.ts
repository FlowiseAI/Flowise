import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

export enum CustomOrganizationUserStatus {
    ACTIVE = 'active',
    INVITED = 'invited',
    DISABLED = 'disabled',
    REMOVED = 'removed'
}

export enum CustomOrganizationUserRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
    VIEWER = 'viewer'
}

@Entity({ name: 'organization_user' }) // Reference the same table as Enterprise OrganizationUser
export class CustomOrganizationUser {
    @PrimaryColumn({ type: 'varchar' })
    organizationId: string

    @PrimaryColumn({ type: 'varchar' })
    userId: string

    @Column({ type: 'varchar', length: 20, default: CustomOrganizationUserRole.MEMBER })
    role: string

    @Column({ type: 'varchar', length: 20, default: CustomOrganizationUserStatus.INVITED })
    status: string

    @Column({ type: 'varchar', nullable: true })
    department?: string | null

    @Column({ type: 'varchar', nullable: true })
    jobTitle?: string | null

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: false })
    createdBy: string

    @Column({ nullable: false })
    updatedBy: string
}
