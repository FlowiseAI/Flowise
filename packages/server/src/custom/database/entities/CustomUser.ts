import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum CustomUserStatus {
    ACTIVE = 'active',
    INVITED = 'invited',
    UNVERIFIED = 'unverified',
    DELETED = 'deleted'
}

@Entity({ name: 'user' }) // Reference the same table as Enterprise User
export class CustomUser {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 100 })
    name: string

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string

    @Column({ type: 'text', nullable: true })
    credential?: string | null

    @Column({ type: 'text', nullable: true, unique: true })
    tempToken?: string | null

    @CreateDateColumn({ nullable: true })
    tokenExpiry?: Date | null

    @Column({ type: 'varchar', length: 20, default: CustomUserStatus.UNVERIFIED })
    status: string

    @CreateDateColumn()
    createdDate?: Date

    @UpdateDateColumn()
    updatedDate?: Date

    @Column({ nullable: false })
    createdBy: string

    @Column({ nullable: false })
    updatedBy: string
}
