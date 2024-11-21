import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, DeleteDateColumn } from 'typeorm'
import { ChatFlow } from './ChatFlow'
import { User } from './User'
import { Organization } from './Organization'

@Entity()
export class Chat {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ nullable: true })
    title: string

    @Column({ nullable: true })
    chatflowChatId: string

    @ManyToOne(() => ChatFlow, { nullable: true })
    chatflow: ChatFlow

    @ManyToOne(() => User, { nullable: true })
    owner: User

    @Column({ nullable: true })
    ownerId: string

    @ManyToOne(() => Organization, { nullable: true })
    organization: Organization

    @Column({ nullable: true })
    organizationId: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date

    @DeleteDateColumn()
    deletedDate: Date
}
