/* eslint-disable */
import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { ICredential } from '../../Interface'

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

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
