import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum CustomOrganizationName {
    DEFAULT_ORGANIZATION = 'Default Organization'
}

export enum CustomOrganizationStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    DELETED = 'deleted'
}

@Entity({ name: 'organization' }) // Reference the same table as Enterprise Organization
export class CustomOrganization {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 100, default: CustomOrganizationName.DEFAULT_ORGANIZATION })
    name: string

    @Column({ type: 'varchar', length: 100, nullable: true })
    customerId?: string | null

    @Column({ type: 'varchar', length: 100, nullable: true })
    subscriptionId?: string | null

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: false })
    createdBy: string

    @Column({ nullable: false })
    updatedBy: string
}
