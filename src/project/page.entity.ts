import { Project } from 'src/project/project.entity';
import { LayerDto } from 'src/export/export.service';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('page')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  pageName!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  layers!: LayerDto[];

  @Column()
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.pages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
