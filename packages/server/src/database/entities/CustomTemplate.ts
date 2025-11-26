import { ICustomTemplate } from '../../Interface'
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

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

    @Column({ nullable: false, type: 'text' })
    workspaceId: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
