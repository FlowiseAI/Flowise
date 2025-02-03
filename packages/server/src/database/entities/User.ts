import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, UpdateDateColumn } from 'typeorm'
import { ChatFlow } from './ChatFlow'
import { OneToMany } from 'typeorm'

export enum UserRole {
  MASTER_ADMIN = 'MASTER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  username: string

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string

  @Column({ type: 'enum', enum: UserRole, default: UserRole.ADMIN })
  role: UserRole

  @Column('varchar', { nullable: true, default: '' })
  groupname: string

  @Column('varchar', { nullable: true })
  displayPrefixes: string

  @Column({ type: 'varchar', length: 255 })
  password: string

  @OneToMany(() => ChatFlow, (chatFlow) => chatFlow.user)
  chatFlows: ChatFlow[]

  @Column({ type: 'timestamp' })
  @CreateDateColumn()
  createdDate: Date

  @Column({ type: 'timestamp' })
  @UpdateDateColumn()
  updatedDate: Date
}
