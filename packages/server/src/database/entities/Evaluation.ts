import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { IEvaluation } from '../../Interface'

@Entity()
export class Evaluation implements IEvaluation {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    average_metrics: string

    @Column({ type: 'text' })
    additionalConfig: string

    @Column()
    name: string

    @Column()
    evaluationType: string

    @Column()
    chatflowId: string

    @Column()
    chatflowName: string

    @Column()
    datasetId: string

    @Column()
    datasetName: string

    @Column()
    status: string

    @UpdateDateColumn()
    runDate: Date

    @Column({ nullable: false, type: 'text' })
    workspaceId: string
}
