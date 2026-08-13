import { User } from 'src/user/user.entity';
import { Page } from 'src/project/page.entity';
import type { DesignTokens } from 'src/export/export.service';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('project')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  industry?: string;

  @Column({
    type: 'varchar',
    default: 'draft',
  })
  status!: 'draft' | 'published';

  @Column({ type: 'jsonb', nullable: true })
  theme?: DesignTokens;

  @Column()
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @OneToMany(() => Page, (page) => page.project, { cascade: true })
  pages!: Page[];

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
