import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, UpdateDateColumn, OneToMany } from 'typeorm'
import { User } from './User'

@Entity('group_users')
export class GroupUsers {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  groupname: string

  @OneToMany(() => User, (user) => user.group)
  users: User[]

  @Column({ type: 'timestamp' })
  @CreateDateColumn()
  createdDate: Date

  @Column({ type: 'timestamp' })
  @UpdateDateColumn()
  updatedDate: Date
}
