import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

export enum CustomWorkspaceUserStatus {
    ACTIVE = 'active',
    INVITED = 'invited',
    DISABLED = 'disabled',
    REMOVED = 'removed'
}

export enum CustomWorkspaceUserRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
    VIEWER = 'viewer'
}

@Entity({ name: 'workspace_user' }) // Reference the same table as Enterprise WorkspaceUser
export class CustomWorkspaceUser {
    @PrimaryColumn({ type: 'varchar' })
    workspaceId: string

    @PrimaryColumn({ type: 'varchar' })
    userId: string

    @Column({ type: 'varchar', length: 20, default: CustomWorkspaceUserRole.MEMBER })
    role: string

    @Column({ type: 'varchar', length: 20, default: CustomWorkspaceUserStatus.INVITED })
    status: string

    @Column({ type: 'varchar', nullable: true })
    lastLogin?: string | null

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: false })
    createdBy: string

    @Column({ nullable: false })
    updatedBy: string
}
