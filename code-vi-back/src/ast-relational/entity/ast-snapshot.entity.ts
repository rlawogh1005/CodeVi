import { CommonEntity } from 'src/common/entities/common.entity';
import { TeamProject } from 'src/team-project/entities/team-project.entity';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AstDirectory } from './ast-directory.entity';

@Entity('ast_snapshot')
export class AstSnapshot extends CommonEntity {
  @Column()
  teamProjectId: number;

  @ManyToOne(() => TeamProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  @OneToMany(() => AstDirectory, (dir) => dir.snapshot, { cascade: true })
  directories: AstDirectory[];
}
