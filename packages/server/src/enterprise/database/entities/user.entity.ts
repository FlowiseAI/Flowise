import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { LoginMethod } from './login-method.entity'
import { OrganizationUser } from './organization-user.entity'
import { Organization } from './organization.entity'
import { Role } from './role.entity'
import { WorkspaceUser } from './workspace-user.entity'
import { Workspace } from './workspace.entity'

export enum UserStatus {
    ACTIVE = 'active',
    INVITED = 'invited',
    UNVERIFIED = 'unverified',
    DELETED = 'deleted'
}

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 100 })
    name: string

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string

    @Column({ type: 'text', nullable: true })
    credential?: string | null

    @Column({ type: 'text', nullable: true, unique: true })
    tempToken?: string | null

    @CreateDateColumn({ nullable: true })
    tokenExpiry?: Date | null

    @Column({ type: 'varchar', length: 20, default: UserStatus.UNVERIFIED })
    status: string

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: false })
    createdBy: string
    @ManyToOne(() => User, (user) => user.id, {})
    @JoinColumn({ name: 'createdBy' })
    createdByUser?: User

    @Column({ nullable: false })
    updatedBy: string
    @ManyToOne(() => User, (user) => user.id, {})
    @JoinColumn({ name: 'updatedBy' })
    updatedByUser?: User

    @OneToMany(() => Organization, (organization) => organization.createdByUser)
    createdOrganizations?: Organization[]

    @OneToMany(() => Organization, (organization) => organization.updatedByUser)
    updatedOrganizations?: Organization[]

    @OneToMany(() => Role, (role) => role.createdByUser)
    createdRoles?: Role[]

    @OneToMany(() => Role, (role) => role.updatedByUser)
    updatedRoles?: Role[]

    @OneToMany(() => OrganizationUser, (organizationUser) => organizationUser.createdByUser)
    createdOrganizationUser?: OrganizationUser[]

    @OneToMany(() => OrganizationUser, (organizationUser) => organizationUser.updatedByUser)
    updatedOrganizationUser?: OrganizationUser[]

    @OneToMany(() => Workspace, (workspace) => workspace.createdByUser)
    createdWorkspace?: Workspace[]

    @OneToMany(() => Workspace, (workspace) => workspace.updatedByUser)
    updatedWorkspace?: Workspace[]

    @OneToMany(() => WorkspaceUser, (workspaceUser) => workspaceUser.createdByUser)
    createdWorkspaceUser?: WorkspaceUser[]

    @OneToMany(() => WorkspaceUser, (workspaceUser) => workspaceUser.updatedByUser)
    updatedByWorkspaceUser?: WorkspaceUser[]

    @OneToMany(() => LoginMethod, (loginMethod) => loginMethod.createdByUser)
    createdByLoginMethod?: LoginMethod[]

    @OneToMany(() => LoginMethod, (loginMethod) => loginMethod.updatedByUser)
    updatedByLoginMethod?: LoginMethod[]
}
