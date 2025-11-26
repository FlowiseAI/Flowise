import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Organization } from './organization.entity'
import { User } from './user.entity'

export enum WorkspaceName {
    DEFAULT_WORKSPACE = 'Default Workspace',
    DEFAULT_PERSONAL_WORKSPACE = 'Personal Workspace'
}

@Entity()
export class Workspace {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 100, default: WorkspaceName.DEFAULT_PERSONAL_WORKSPACE })
    name: string

    @Column({ type: 'text', nullable: true })
    description?: string

    @Column({ nullable: false })
    organizationId?: string
    @ManyToOne(() => Organization, (organization) => organization.id)
    @JoinColumn({ name: 'organizationId' })
    organization?: Organization

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: false })
    createdBy?: string
    @ManyToOne(() => User, (user) => user.createdWorkspace)
    @JoinColumn({ name: 'createdBy' })
    createdByUser?: User

    @Column({ nullable: false })
    updatedBy?: string
    @ManyToOne(() => User, (user) => user.updatedWorkspace)
    @JoinColumn({ name: 'updatedBy' })
    updatedByUser?: User
}
