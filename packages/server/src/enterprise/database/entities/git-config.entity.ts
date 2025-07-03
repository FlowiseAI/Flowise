import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { User } from './user.entity'
import { Organization } from './organization.entity'

@Entity('git_config')
export class GitConfig {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ nullable: true })
    organizationId?: string
    @ManyToOne(() => Organization, (organization) => organization.id)
    @JoinColumn({ name: 'organizationId' })
    organization?: Organization

    @Column({ type: 'varchar', length: 32, default: 'github' })
    provider: string // 'github', 'gitlab', 'bitbucket', 'generic'

    @Column({ type: 'text' })
    repository: string

    @Column({ type: 'varchar', length: 16, default: 'token' })
    authMode: string // 'basic', 'token', 'ssh'

    @Column({ type: 'varchar', length: 100 })
    username: string

    @Column({ type: 'text' })
    secret: string

    @Column({ type: 'varchar', length: 100, default: 'main' })
    branchName: string

    @Column({ type: 'boolean', default: false })
    isActive: boolean

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @Column({ type: 'uuid' })
    createdBy: string
    @ManyToOne(() => User)
    @JoinColumn({ name: 'createdBy' })
    createdByUser?: User

    @Column({ type: 'uuid' })
    updatedBy: string
    @ManyToOne(() => User)
    @JoinColumn({ name: 'updatedBy' })
    updatedByUser?: User
} 