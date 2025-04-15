/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { AppCsvParseRunsStatus, IAppCsvParseRuns } from '../../Interface'
import { ICommonObject } from 'flowise-components'

@Entity()
export class AppCsvParseRuns implements IAppCsvParseRuns {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    userId: string

    @Index()
    @Column({ type: 'uuid' })
    organizationId: string

    @Column({ type: 'timestamp' })
    startedAt: Date

    @Column({ type: 'timestamp', nullable: true })
    completedAt?: Date

    @Column({ type: 'integer' })
    rowsRequested: number

    @Column({ type: 'integer', nullable: true })
    rowsProcessed?: number

    @Column({ type: 'text' })
    name: string

    @Column({ type: 'json' })
    configuration: ICommonObject

    @Column({ type: 'text' })
    originalCsvUrl: string

    @Column({ type: 'text', nullable: true })
    processedCsvUrl?: string

    @Column({ type: 'text' })
    chatflowChatId: string

    @Column({ type: 'boolean', default: false })
    includeOriginalColumns: boolean

    @Column({ type: 'text' })
    status: AppCsvParseRunsStatus

    @Column({ type: 'json' })
    errorMessages: string[]

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
