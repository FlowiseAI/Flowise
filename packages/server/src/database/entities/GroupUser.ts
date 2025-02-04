import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, UpdateDateColumn } from 'typeorm'

@Entity('group_users')
export class GroupUsers {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  groupname: string

  @Column({ type: 'timestamp' })
  @CreateDateColumn()
  createdDate: Date

  @Column({ type: 'timestamp' })
  @UpdateDateColumn()
  updatedDate: Date
}
