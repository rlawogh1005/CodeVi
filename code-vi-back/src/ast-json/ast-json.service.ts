import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AstJsonData } from './entity/ast-json-data.entity';
import { TeamProject } from 'src/team-project/entities/team-project.entity';
import { CreateJsonAstDto } from './dto/create-json-ast.dto';

@Injectable()
export class AstJsonService {
  private readonly logger = new Logger(AstJsonService.name);

  constructor(
    @InjectRepository(AstJsonData)
    private readonly astJsonRepo: Repository<AstJsonData>,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepo: Repository<TeamProject>,
  ) {}

  /**
   * AST 데이터를 JSON 통째로 저장
   */
  async saveAstData(dto: CreateJsonAstDto): Promise<AstJsonData> {
    const { jenkinsJobName, nodes } = dto;

    const project = await this.teamProjectRepo.findOneBy({
      JenkinsJobName: jenkinsJobName,
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${jenkinsJobName}`);
    }

    const entity = this.astJsonRepo.create({
      astContent: nodes,
      teamProjectId: project.id,
    });

    const saved = await this.astJsonRepo.save(entity);
    this.logger.log(`JSON AST saved: id=${saved.id}, project=${jenkinsJobName}`);

    return saved;
  }

  /**
   * 전체 AST JSON 데이터 조회
   */
  async getAllAstData(): Promise<AstJsonData[]> {
    return this.astJsonRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 단건 AST JSON 데이터 조회
   */
  async getAstDataById(id: number): Promise<AstJsonData> {
    const data = await this.astJsonRepo.findOneBy({ id });
    if (!data) {
      throw new NotFoundException(`AST JSON data not found: ${id}`);
    }
    return data;
  }
}
