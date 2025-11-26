import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { User } from './user.entity'
import { Role } from './role.entity'
import { Workspace } from './workspace.entity'

export enum WorkspaceUserStatus {
    ACTIVE = 'active',
    DISABLE = 'disable',
    INVITED = 'invited'
}

@Entity({ name: 'workspace_user' })
export class WorkspaceUser {
    @PrimaryColumn()
    workspaceId: string
    @ManyToOne(() => Workspace, (workspace) => workspace.id)
    @JoinColumn({ name: 'workspaceId' })
    workspace: Workspace

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

    @Column({ type: 'varchar', length: 20, default: WorkspaceUserStatus.INVITED })
    status?: string

    @CreateDateColumn()
    lastLogin?: string

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: false })
    createdBy?: string
    @ManyToOne(() => User, (user) => user.createdWorkspaceUser)
    @JoinColumn({ name: 'createdBy' })
    createdByUser?: User

    @Column({ nullable: false })
    updatedBy?: string
    @ManyToOne(() => User, (user) => user.updatedByWorkspaceUser)
    @JoinColumn({ name: 'updatedBy' })
    updatedByUser?: User
}
