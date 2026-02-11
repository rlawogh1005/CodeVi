// src/ast-data/entities/ast-data.entity.ts
import { CommonEntity } from 'src/common/entities/common.entity';
import { TeamProject } from 'src/team-project/entities/team-project.entity';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AstAbstractData } from './ast-abstract-data.entity';

@Entity()
export class AstData extends CommonEntity {
  @Column('json')
  astContent: any;

  @Column()
  teamProjectId: number;

  @ManyToOne(() => TeamProject, (project) => project.astDatas)
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  @OneToMany(() => AstAbstractData, (abstractData) => abstractData.astData)
  abstractDatas: AstAbstractData[];
}
