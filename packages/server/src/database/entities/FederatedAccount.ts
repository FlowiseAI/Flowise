import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm'

/**
 * Binds external IdP principal (issuer + sub) to org/workspace for audit and optional Flowise user linking.
 */
@Entity('federated_account')
@Index(['issuerUrl', 'subject'], { unique: true })
export class FederatedAccount {
    @PrimaryColumn({ type: 'varchar', length: 36 })
    id: string

    @Column({ type: 'text', name: 'issuerUrl' })
    issuerUrl: string

    @Column({ type: 'varchar', length: 512 })
    subject: string

    @Column({ type: 'varchar', length: 36 })
    organizationId: string

    @Column({ type: 'varchar', length: 36 })
    workspaceId: string

    @Column({ type: 'varchar', length: 36, nullable: true })
    userId: string | null

    @Column({ type: 'varchar', length: 512, nullable: true })
    email: string | null

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
