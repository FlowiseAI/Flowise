import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum CustomWorkspaceName {
    DEFAULT_WORKSPACE = 'Default Workspace',
    DEFAULT_PERSONAL_WORKSPACE = 'Personal Workspace'
}

export enum CustomWorkspaceStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    DELETED = 'deleted'
}

@Entity({ name: 'workspace' }) // Reference the same table as Enterprise Workspace
export class CustomWorkspace {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 100, default: CustomWorkspaceName.DEFAULT_PERSONAL_WORKSPACE })
    name: string

    @Column({ type: 'text', nullable: true })
    description?: string | null

    @Column({ 
        type: 'varchar', 
        length: 20,
        default: CustomWorkspaceStatus.ACTIVE 
    })
    status: CustomWorkspaceStatus

    @Column({ nullable: false })
    organizationId: string

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: false })
    createdBy: string

    @Column({ nullable: false })
    updatedBy: string
}
