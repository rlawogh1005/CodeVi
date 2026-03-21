import { CodeAnalysis } from '../../code-analysis/entities/code-analysis.entity';
import { CommonEntity } from '../../common/entities/common.entity';
import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class TeamProject extends CommonEntity {
  @Column({ type: 'varchar' })
  teamName: string;

  @Column()
  JenkinsJobName: string;

  @Column({ nullable: true })
  sonarProjectKey: string;

  @OneToMany(() => CodeAnalysis, (codeAnalysis) => codeAnalysis.teamProject, {
    cascade: true,
  })
  codeAnalyses: CodeAnalysis[];



  @ManyToMany(() => User, (user) => user.teamProjects)
  @JoinTable()
  users: User[];
}
