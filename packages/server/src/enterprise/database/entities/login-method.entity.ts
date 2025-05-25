import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { User } from './user.entity'
import { Organization } from './organization.entity'

export enum LoginMethodStatus {
    ENABLE = 'enable',
    DISABLE = 'disable'
}

@Entity({ name: 'login_method' })
export class LoginMethod {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ nullable: true })
    organizationId?: string
    @ManyToOne(() => Organization, (organization) => organization.id)
    @JoinColumn({ name: 'organizationId' })
    organization?: Organization

    @Column({ type: 'varchar', length: 100 })
    name: string

    @Column({ type: 'text' })
    config: string

    @Column({ type: 'varchar', length: 20, default: LoginMethodStatus.ENABLE })
    status?: string

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: true })
    createdBy?: string
    @ManyToOne(() => User, (user) => user.createdByLoginMethod)
    @JoinColumn({ name: 'createdBy' })
    createdByUser?: User

    @Column({ nullable: true })
    updatedBy?: string
    @ManyToOne(() => User, (user) => user.updatedByLoginMethod)
    @JoinColumn({ name: 'updatedBy' })
    updatedByUser?: User
}
