/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ChatflowType, IChatFlow } from '../../Interface'
import { User } from './User'

@Entity()
export class ChatFlow implements IChatFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ type: 'text' })
  flowData: string

  @Column({ nullable: true })
  deployed?: boolean

  @Column({ nullable: true })
  isPublic?: boolean

  @Column({ nullable: true })
  isPublish?: boolean

  @Column({ nullable: true })
  apikeyid?: string

  @Column({ nullable: true, type: 'text' })
  chatbotConfig?: string

  @Column({ nullable: true, type: 'text' })
  apiConfig?: string

  @Column({ nullable: true, type: 'text' })
  analytic?: string

  @Column({ nullable: true, type: 'text' })
  speechToText?: string

  @Column({ nullable: true, type: 'text' })
  followUpPrompts?: string

  @Column('varchar', { nullable: true, default: '' })
  groupname: string

  @Column({ nullable: true, type: 'text' })
  category?: string

  @Column({ nullable: true, type: 'text' })
  type?: ChatflowType

  @Column({ type: 'uuid', nullable: true })
  userId: string

  @ManyToOne(() => User, (user) => user.chatFlows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'timestamp' })
  @CreateDateColumn()
  createdDate: Date

  @Column({ type: 'timestamp' })
  @UpdateDateColumn()
  updatedDate: Date
}
