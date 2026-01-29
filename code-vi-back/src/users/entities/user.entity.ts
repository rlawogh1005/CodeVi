import { Entity, Column, OneToMany, ManyToMany } from 'typeorm';
import { UserRole } from './user-role.enum';
import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';

@Entity()
export class User extends CommonEntity {
  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 18 })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole, nullable: false })
  role: UserRole;

  @ManyToMany(() => TeamProject, (teamProject) => teamProject.users)
  teamProjects: TeamProject[];
}
