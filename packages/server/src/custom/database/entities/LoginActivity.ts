import { Entity, Column, PrimaryColumn, CreateDateColumn, BeforeInsert } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

@Entity({ name: 'login_activity' })
export class LoginActivity {
    @PrimaryColumn()
    id: string

    @BeforeInsert()
    generateId() {
        this.id = uuidv4()
    }

    @Column({ type: 'varchar', length: 255 })
    username: string

    @Column({ type: 'int', name: 'activity_code' })
    activityCode: number

    @Column({ type: 'varchar', length: 500 })
    message: string

    @CreateDateColumn({ name: 'attemptedDateTime' })
    attemptedDateTime: Date

    @Column({ type: 'varchar', length: 50, name: 'login_mode', nullable: true })
    loginMode?: string
}
