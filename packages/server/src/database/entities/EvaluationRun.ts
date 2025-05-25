import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { IEvaluationRun } from '../../Interface'

@Entity()
export class EvaluationRun implements IEvaluationRun {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    evaluationId: string

    @Column({ type: 'text' })
    input: string

    @Column({ type: 'text' })
    expectedOutput: string

    @UpdateDateColumn()
    runDate: Date

    @Column({ type: 'text' })
    actualOutput: string

    @Column({ type: 'text' })
    metrics: string

    @Column({ type: 'text' })
    llmEvaluators: string

    @Column({ type: 'text' })
    evaluators: string

    @Column({ type: 'text' })
    errors: string
}
