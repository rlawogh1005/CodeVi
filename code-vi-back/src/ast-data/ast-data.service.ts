import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AstData } from './entity/ast-data.entity';
import { AstNodeDto } from './dto/ast-node.dto';
import { CreateAstDataDto } from './dto/ast-data-request.dto';
import { TeamProject } from 'src/team-project/entities/team-project.entity';

@Injectable()
export class AstDataService {
  constructor(
    @InjectRepository(AstData)
    private readonly astDataRepository: Repository<AstData>,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepository: Repository<TeamProject>,
  ) {}

  async saveAstData(payload: any): Promise<AstData[]> {
    const { jenkinsJobName, nodes } = payload; // 이제 파서가 이걸 보내줍니다.

    // 유효성 검사
    if (!nodes || !Array.isArray(nodes)) {
      throw new Error("Invalid AST data format: 'nodes' array is missing.");
    }

    const project = await this.teamProjectRepository.findOneBy({
      JenkinsJobName: jenkinsJobName,
    });

    if (!project) {
      throw new Error(`Project not found: ${jenkinsJobName}`);
    }

    const entities = nodes.map((data) => {
      const entity = new AstData();
      entity.astContent = data;
      entity.teamProjectId = project.id; // 관계 자동 생성
      return entity;
    });

    return this.astDataRepository.save(entities);
  }

  async getAllAstData() {
    return this.astDataRepository.find();
  }
}
