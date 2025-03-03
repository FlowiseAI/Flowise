/* eslint-disable */
import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { ICredential } from '../../Interface'

export enum CredentialVisibility {
    PRIVATE = 'Private',
    ORGANIZATION = 'Organization',
    PLATFORM = 'Platform'
}

@Entity()
export class Credential implements ICredential {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column()
    credentialName: string

    @Column({ type: 'text' })
    encryptedData: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Index()
    @Column({ type: 'uuid', nullable: true })
    userId?: string

    @Index()
    @Column({ type: 'uuid', nullable: true })
    organizationId?: string

    @Column({
        type: 'simple-array',
        enum: CredentialVisibility,
        default: 'Private'
    })
    visibility?: CredentialVisibility[]
}
