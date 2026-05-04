/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'
import { ISkill } from '../../Interface'

/**
 * Skill — the single entity for JSON-first skill model.
 *
 * One row represents a whole skill "app" (a self-contained bundle of files).
 * The `fileTree` column holds the tree of files/folders as a JSON string;
 * every file node's bytes live in object storage under
 * `skills/{workspaceId}/{skillId}/nodes/{nodeId}.{json|bin}`.
 */
@Entity({ name: 'skill' })
export class Skill implements ISkill {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ nullable: false, type: 'text' })
    workspaceId: string

    @Column({ type: 'varchar', length: 255 })
    name: string

    @Column({ type: 'text', nullable: true })
    description?: string | null

    @Column({ type: 'varchar', length: 255, nullable: true })
    iconSrc?: string | null

    @Column({ type: 'varchar', length: 16, nullable: true })
    color?: string | null

    // The whole file tree (files + folders) as one JSON string — shape: SkillFileTree.
    @Column({ type: 'text' })
    fileTree: string

    // sha256(fileTree JSON + sorted(nodeId|nodeDigest)). One-shot cache key for the skill.
    @Column({ type: 'varchar', length: 64 })
    contentDigest: string

    // Pointer to the most recent published bundle. null until first publish.
    @Column({ type: 'varchar', length: 64, nullable: true })
    publishedBundleId?: string | null

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
