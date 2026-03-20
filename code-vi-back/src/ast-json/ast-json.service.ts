/**
 * ======================================================================
 * [LEGACY] AST JSON Storage Service
 * ======================================================================
 * 이 서비스는 AST 데이터를 JSON 통째로 저장하는 로직입니다.
 * 현재 비활성화 상태이며, 추후 HDD 아키텍처로 분리하여 재활용할 예정입니다.
 * 
 * 비활성화 일자: 2026-03-20
 * 사유: Relational AST 저장 방식으로 통합 (port 13000)
 * ======================================================================
 */

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
   * [LEGACY - DISABLED] AST 데이터를 JSON 통째로 저장
   * 
   * 이 메서드는 현재 비활성화되어 있습니다.
   * 추후 HDD 별도 저장 아키텍처로 전환 시 다시 활성화할 예정입니다.
   */
  async saveAstData(dto: CreateJsonAstDto): Promise<any> {
    this.logger.warn(
      `[LEGACY] JSON AST 저장 요청이 들어왔지만 비활성화 상태입니다. ` +
      `Relational AST 엔드포인트(/api/ast-data/relational)를 사용해주세요.`
    );
    return {
      status: 'disabled',
      message: 'JSON AST 저장은 비활성화되었습니다. /api/ast-data/relational 엔드포인트를 사용해주세요.',
    };

    // --- 아래는 원래 JSON 저장 로직 (Legacy) ---
    // const { jenkinsJobName, nodes } = dto;
    //
    // const project = await this.teamProjectRepo.findOneBy({
    //   JenkinsJobName: jenkinsJobName,
    // });
    //
    // if (!project) {
    //   throw new NotFoundException(`Project not found: ${jenkinsJobName}`);
    // }
    //
    // const entity = this.astJsonRepo.create({
    //   astContent: nodes,
    //   teamProjectId: project.id,
    // });
    //
    // const saved = await this.astJsonRepo.save(entity);
    // this.logger.log(`JSON AST saved: id=${saved.id}, project=${jenkinsJobName}`);
    //
    // return saved;
  }

  /**
   * 전체 AST JSON 데이터 조회 (Legacy - 기존 데이터 읽기용으로 유지)
   */
  async getAllAstData(): Promise<AstJsonData[]> {
    return this.astJsonRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 단건 AST JSON 데이터 조회 (Legacy - 기존 데이터 읽기용으로 유지)
   */
  async getAstDataById(id: number): Promise<AstJsonData> {
    const data = await this.astJsonRepo.findOneBy({ id });
    if (!data) {
      throw new NotFoundException(`AST JSON data not found: ${id}`);
    }
    return data;
  }
}
