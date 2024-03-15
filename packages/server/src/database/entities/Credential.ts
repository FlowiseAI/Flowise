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

    @Column({type:'timestamp with time zone'})
    @CreateDateColumn()
    createdDate: Date

    @Column({type:'timestamp with time zone'})
    @UpdateDateColumn()
    updatedDate: Date
}
