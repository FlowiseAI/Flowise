/* eslint-disable */
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { IEncryptionCredential } from '../../Interface'

@Entity()
export class EncryptionCredential implements IEncryptionCredential {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    encryptionId: string

    @Column()
    credentialId: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
