import { ICustomTemplate } from '../../Interface'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('custom_template')
export class CustomTemplate implements ICustomTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column({ type: 'text' })
    flowData: string

    @Column({ nullable: true, type: 'text' })
    description?: string

    @Column({ nullable: true, type: 'text' })
    badge?: string

    @Column({ nullable: true, type: 'text' })
    framework?: string

    @Column({ nullable: true, type: 'text' })
    usecases?: string

    @Column({ nullable: true, type: 'text' })
    type?: string

    @Column({ nullable: true, type: 'text' })
    chatbotConfig?: string

    @Column({ nullable: true, type: 'text' })
    visibility?: string[]

    @Column({ nullable: true, type: 'text' })
    apiConfig?: string

    @Column({ nullable: true, type: 'text' })
    speechToText?: string

    @Column({ nullable: true, type: 'text' })
    category?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Index()
    @Column({ type: 'uuid', nullable: true })
    userId: string

    @Index()
    @Column({ type: 'uuid', nullable: true })
    organizationId: string

    @Column({ type: 'boolean', nullable: true })
    shareWithOrg: boolean

    @DeleteDateColumn()
    deletedDate: Date

    @Index()
    @Column({ type: 'uuid', nullable: true })
    parentId: string
}
