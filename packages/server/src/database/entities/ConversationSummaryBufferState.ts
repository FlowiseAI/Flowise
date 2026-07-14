/* eslint-disable */
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity()
@Index('IDX_conversation_summary_buffer_state_session', ['chatflowid', 'sessionId'])
export class ConversationSummaryBufferState {
    @PrimaryColumn({ type: 'varchar', length: 64 })
    stateKey: string

    @Column({ type: 'uuid' })
    chatflowid: string

    @Column({ type: 'varchar' })
    sessionId: string

    @Column({ type: 'varchar' })
    nodeId: string

    @Column({ type: 'text' })
    summary: string

    @Column({ nullable: true, type: 'timestamp' })
    cursorCreatedDate?: Date | null

    @Column({ nullable: true, type: 'uuid' })
    cursorMessageId?: string | null

    @Column({ type: 'int', default: 1 })
    version: number

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
