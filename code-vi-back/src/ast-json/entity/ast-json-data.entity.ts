import { CommonEntity } from 'src/common/entities/common.entity';
import { TeamProject } from 'src/team-project/entities/team-project.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity('ast_json_data')
export class AstJsonData extends CommonEntity {
  @Column({ type: 'json' })
  astContent: any;

  @Column()
  teamProjectId: number;

  @ManyToOne(() => TeamProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;
}
