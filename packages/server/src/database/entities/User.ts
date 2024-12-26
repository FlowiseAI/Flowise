import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index, UpdateDateColumn } from 'typeorm'

/* eslint-disable */

export enum UserRole {
  STOCK = 'STOCK',
  UNI = 'UNI',
  ADMIN = 'ADMIN'
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

  @Column({ type: 'varchar', length: 255 })
  password: string

  @Column({ type: 'timestamp' })
  @CreateDateColumn()
  createdDate: Date

  @Column({ type: 'timestamp' })
  @UpdateDateColumn()
  updatedDate: Date
}
