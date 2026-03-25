import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

// Entities
import { AstSnapshot } from './entity/ast-snapshot.entity';
import { AstDirectory } from './entity/ast-directory.entity';
import { AstFile } from './entity/ast-file.entity';
import { AstClass } from './entity/ast-class.entity';
import { AstFunction } from './entity/ast-function.entity';
import { TeamProject } from 'src/team-project/entities/team-project.entity';

// DTOs
import { CreateRelationalAstDto, AstNodeInputDto } from './dto/create-relational-ast.dto';

@Injectable()
export class AstRelationalService {
  private readonly logger = new Logger(AstRelationalService.name);

  constructor(
    @InjectRepository(AstSnapshot)
    private readonly snapshotRepo: Repository<AstSnapshot>,

    @InjectRepository(AstDirectory)
    private readonly directoryRepo: Repository<AstDirectory>,

    @InjectRepository(AstFile)
    private readonly fileRepo: Repository<AstFile>,

    @InjectRepository(AstClass)
    private readonly classRepo: Repository<AstClass>,

    @InjectRepository(AstFunction)
    private readonly functionRepo: Repository<AstFunction>,

    @InjectRepository(TeamProject)
    private readonly teamProjectRepo: Repository<TeamProject>,

    private readonly dataSource: DataSource,
  ) { }

  // 클래스 상단에 추가
  private async measure<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ data: T; latencyMs: number; memKb: number }> {
    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const data = await fn();

    const latency = performance.now() - start;
    const mem = Math.max(0, process.memoryUsage().heapUsed - startMem);

    this.logger.log(`${name} → ${latency.toFixed(2)}ms, ${(mem / 1024).toFixed(1)}KB`);
    return { data, latencyMs: +latency.toFixed(2), memKb: Math.floor(mem / 1024) };
  }

  /**
   * AST JSON 트리를 받아서 정규화된 엔티티로 분해 저장
   */
  async saveAstData(dto: CreateRelationalAstDto): Promise<AstSnapshot> {
    const { jenkinsJobName, nodes } = dto;

    const project = await this.teamProjectRepo.findOneBy({
      JenkinsJobName: jenkinsJobName,
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${jenkinsJobName}`);
    }

    // 1. 트랜잭션 블록 안에서 시간 및 메모리를 측정하며 저장만 합니다.
    const resultStats = { jsonSaveMs: 0, jsonSaveMem: 0, relationalSaveMs: 0, relationalSaveMem: 0, snapshotId: 0 };
    await this.dataSource.transaction(async (manager) => {
      // 1) 스냅샷 생성
      const startJsonMem = process.memoryUsage().heapUsed;
      const startJsonSave = performance.now();
      const snapshot = manager.create(AstSnapshot, {
        teamProjectId: project.id,
        wholeJson: nodes,
      });
      const savedSnapshot = await manager.save(snapshot);
      resultStats.jsonSaveMs = performance.now() - startJsonSave;
      resultStats.jsonSaveMem = Math.max(0, process.memoryUsage().heapUsed - startJsonMem);
      resultStats.snapshotId = savedSnapshot.id;

      // 2) 재귀적으로 노드들을 저장
      const startRelMem = process.memoryUsage().heapUsed;
      const startRelationalSave = performance.now();
      for (const node of nodes) {
        await this.processNode(manager, node, savedSnapshot.id, null);
      }
      resultStats.relationalSaveMs = performance.now() - startRelationalSave;
      resultStats.relationalSaveMem = Math.max(0, process.memoryUsage().heapUsed - startRelMem);

      this.logger.log(`Relational AST saved: snapshotId=${savedSnapshot.id}, project=${jenkinsJobName}`);
    });

    // 2. 트랜잭션 커밋 이후 최종 조회 결과 반환
    const snapshotResult = await this.getSnapshotById(resultStats.snapshotId);
    return Object.assign(snapshotResult, {
      jsonSaveMs: +(resultStats.jsonSaveMs).toFixed(4),
      jsonSaveMem: resultStats.jsonSaveMem,
      relationalSaveMs: +(resultStats.relationalSaveMs).toFixed(4),
      relationalSaveMem: resultStats.relationalSaveMem
    });
  }

  /**
   * 재귀적으로 AST 노드를 처리하여 적절한 엔티티로 저장
   */
  private async processNode(
    manager: any,
    node: AstNodeInputDto,
    snapshotId: number,
    parentDirectoryId: number | null,
    fileId?: number,
    classId?: number,
  ): Promise<void> {
    // 타입 처리를 위해 대문자로 통일
    const nodeType = node.type ? node.type.toUpperCase() : '';
    const nodeName = this.extractNodeName(node);

    if (nodeType.includes('CLASS') || nodeType.includes('FUNC') || nodeType.includes('METHOD')) {
      this.logger.debug(`👀 Found target node! Type: [${nodeType}], Name: [${nodeName}], FileID: ${fileId}`);
    }

    switch (nodeType) {
      case 'DIRECTORY': {
        const dir = manager.create(AstDirectory, {
          name: nodeName,
          snapshotId,
          parentDirectoryId,
        });
        const savedDir = await manager.save(dir);

        if (node.children) {
          for (const child of node.children) {
            await this.processNode(manager, child, snapshotId, savedDir.id);
          }
        }
        break;
      }

      case 'FILE': {
        if (!parentDirectoryId) {
          this.logger.warn(`FILE node "${node.name}" has no parent directory, skipping`);
          break;
        }

        const file = manager.create(AstFile, {
          name: nodeName,
          directoryId: parentDirectoryId,
        });
        const savedFile = await manager.save(file);

        if (node.ast) {
          await this.processNode(manager, node.ast, snapshotId, parentDirectoryId, savedFile.id);
        }
        break;
      }

      case 'CLASS_DEFINITION':
      case 'CLASS': {
        if (!fileId) {
          this.logger.warn(`CLASS node "${node.name}" has no parent file, skipping`);
          break;
        }

        const cls = manager.create(AstClass, {
          name: nodeName,
          fileId,
          startLine: node.range?.start?.line ?? 0,
          startCol: node.range?.start?.col ?? 0,
          endLine: node.range?.end?.line ?? 0,
          endCol: node.range?.end?.col ?? 0,
        });
        const savedClass = await manager.save(cls);

        if (node.children) {
          for (const child of node.children) {
            await this.processNode(manager, child, snapshotId, parentDirectoryId, fileId, savedClass.id);
          }
        }
        break;
      }

      case 'FUNCTION_DEFINITION':
      case 'METHOD': {
        const fn = manager.create(AstFunction, {
          name: nodeName,
          startLine: node.range?.start?.line ?? 0,
          startCol: node.range?.start?.col ?? 0,
          endLine: node.range?.end?.line ?? 0,
          endCol: node.range?.end?.col ?? 0,
          fileId: classId ? null : (fileId ?? null),
          classId: classId ?? null,
        });
        await manager.save(fn);
        break;
      }

      default:
        // 관심 없는 노드라도 하위 탐색을 지속
        if (node.children) {
          for (const child of node.children) {
            await this.processNode(manager, child, snapshotId, parentDirectoryId, fileId, classId);
          }
        }
        break;
    }
  }

  /**
   * 특정 스냅샷을 관계 데이터와 함께 조회 (TypeORM relations)
   */
  async getSnapshotById(snapshotId: number): Promise<AstSnapshot> {
    const snapshot = await this.snapshotRepo.findOne({
      where: { id: snapshotId },
      relations: [
        'directories',
        'directories.childDirectories',
        'directories.files',
        'directories.files.classes',
        'directories.files.classes.methods',
        'directories.files.fileFunctions',
      ],
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot not found: ${snapshotId}`);
    }

    return snapshot;
  }

  /**
   * QueryBuilder를 이용한 Natural Join 방식 조회
   */
  async getSnapshotByNaturalJoin(snapshotId: number): Promise<AstSnapshot & { latencyMs: number; memKb: number }> {
    const measured = await this.measure('NaturalJoin', () =>
      this.snapshotRepo.createQueryBuilder('snapshot')
        .leftJoinAndSelect('snapshot.directories', 'dir')
        .leftJoinAndSelect('dir.files', 'file')
        .leftJoinAndSelect('file.classes', 'cls')
        .leftJoinAndSelect('cls.methods', 'method')
        .leftJoinAndSelect('file.fileFunctions', 'fileFn')
        .where('snapshot.id = :id', { id: snapshotId })
        .getOne());
    if (!measured.data) {
      throw new NotFoundException(`Snapshot not found: ${snapshotId}`);
    }
    return Object.assign(measured.data, { latencyMs: measured.latencyMs, memKb: measured.memKb });
  }

  /**
   * 원본 JSON 데이터만 조회
   */
  async getSnapshotByWholeJson(snapshotId: number): Promise<AstSnapshot & { latencyMs: number; memKb: number }> {
    const measured = await this.measure('WholeJson', () =>
      this.snapshotRepo
        .createQueryBuilder('snapshot')
        .addSelect('snapshot.wholeJson')
        .where('snapshot.id = :id', { id: snapshotId })
        .getOne());

    if (!measured.data) {
      throw new NotFoundException(`Snapshot not found: ${snapshotId}`);
    }

    return Object.assign(measured.data, { latencyMs: measured.latencyMs, memKb: measured.memKb });
  }

  /**
   * Nested SQL (서브쿼리) 방식 조회 및 애플리케이션 레벨 조립
   */
  async getSnapshotByNested(snapshotId: number): Promise<AstSnapshot & { latencyMs: number; memKb: number }> {
    const measured = await this.measure('Nested', () =>
      this.snapshotRepo
        .createQueryBuilder('snapshot')
        .where('snapshot.id = :id', { id: snapshotId })
        .getOne());

    if (!measured.data) throw new NotFoundException(`Snapshot not found: ${snapshotId}`);

    // 1) 디렉토리 조회
    const directories = await this.directoryRepo
      .createQueryBuilder('dir')
      .where(
        `dir.snapshotId IN (${this.snapshotRepo
          .createQueryBuilder('s')
          .select('s.id')
          .where('s.id = :id')
          .getQuery()})`,
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 2) 파일 조회
    const files = await this.fileRepo
      .createQueryBuilder('file')
      .where(
        `file.directoryId IN (${this.directoryRepo
          .createQueryBuilder('d')
          .select('d.id')
          .where('d.snapshotId = :id')
          .getQuery()})`,
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 3) 클래스 조회
    const classes = await this.classRepo
      .createQueryBuilder('cls')
      .where(
        `cls.fileId IN (${this.fileRepo
          .createQueryBuilder('f')
          .select('f.id')
          .where(
            `f.directoryId IN (${this.directoryRepo
              .createQueryBuilder('d2')
              .select('d2.id')
              .where('d2.snapshotId = :id')
              .getQuery()})`,
          )
          .getQuery()})`,
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 4) 함수 조회 (파일 레벨 + 클래스 메서드)
    const functions = await this.functionRepo
      .createQueryBuilder('fn')
      .where(
        `fn.fileId IN (${this.fileRepo
          .createQueryBuilder('f2')
          .select('f2.id')
          .where(
            `f2.directoryId IN (${this.directoryRepo
              .createQueryBuilder('d3')
              .select('d3.id')
              .where('d3.snapshotId = :id')
              .getQuery()})`,
          )
          .getQuery()})`,
      )
      .orWhere(
        `fn.classId IN (${this.classRepo
          .createQueryBuilder('c2')
          .select('c2.id')
          .where(
            `c2.fileId IN (${this.fileRepo
              .createQueryBuilder('f3')
              .select('f3.id')
              .where(
                `f3.directoryId IN (${this.directoryRepo
                  .createQueryBuilder('d4')
                  .select('d4.id')
                  .where('d4.snapshotId = :id')
                  .getQuery()})`,
              )
              .getQuery()})`,
          )
          .getQuery()})`,
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 5) 메모리에서 트리 구조 조립
    const classMap = new Map<number, AstClass & { methods: AstFunction[] }>();
    classes.forEach((cls) => classMap.set(cls.id, { ...cls, methods: [] }));

    functions.forEach((fn) => {
      if (fn.classId && classMap.has(fn.classId)) {
        classMap.get(fn.classId)!.methods.push(fn);
      }
    });

    const fileMap = new Map<number, AstFile & { classes: any[]; fileFunctions: AstFunction[] }>();
    files.forEach((file) => fileMap.set(file.id, { ...file, classes: [], fileFunctions: [] }));

    classMap.forEach((cls) => {
      if (fileMap.has(cls.fileId)) fileMap.get(cls.fileId)!.classes.push(cls);
    });

    functions.forEach((fn) => {
      if (fn.fileId && !fn.classId && fileMap.has(fn.fileId)) {
        fileMap.get(fn.fileId)!.fileFunctions.push(fn);
      }
    });

    const dirMap = new Map<number, AstDirectory & { files: any[]; childDirectories: any[] }>();
    directories.forEach((dir) => dirMap.set(dir.id, { ...dir, files: [], childDirectories: [] }));

    fileMap.forEach((file) => {
      if (dirMap.has(file.directoryId)) dirMap.get(file.directoryId)!.files.push(file);
    });

    const rootDirectories: any[] = [];
    // 디렉토리 계층 구조 복원
    dirMap.forEach((dir) => {
      if (dir.parentDirectoryId && dirMap.has(dir.parentDirectoryId)) {
        // 부모가 있으면 부모의 childDirectories에 추가
        dirMap.get(dir.parentDirectoryId)!.childDirectories.push(dir);
      } else {
        // 부모가 없으면 최상위 디렉토리로 분류
        rootDirectories.push(dir);
      }
    });

    measured.data.directories = rootDirectories as any;
    return Object.assign(measured.data, { latencyMs: measured.latencyMs, memKb: measured.memKb });
  }

  /**
   * 전체 스냅샷 목록 조회
   */
  async getAllSnapshots(): Promise<AstSnapshot[]> {
    return this.snapshotRepo.find({
      relations: [
        'directories',
        'directories.childDirectories',
        'directories.files',
        'directories.files.classes',
        'directories.files.classes.methods',
        'directories.files.fileFunctions',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 노드에서 이름을 추출하는 헬퍼 메서드
   */
  private extractNodeName(node: AstNodeInputDto): string {
    if (node.name && node.name !== 'undefined' && node.name !== 'null') {
      return node.name;
    }

    if (node.children && Array.isArray(node.children)) {
      const nameNode = node.children.find((c) => c.fieldName === 'name');
      if (nameNode) return nameNode.text || nameNode.name || 'Unknown_Name';

      const idNode = node.children.find(
        (c) => c.type && (c.type.toLowerCase().includes('identifier') || c.type.toLowerCase() === 'name'),
      );
      if (idNode) return idNode.text || idNode.name || 'Unknown_Name';
    }

    if (node.text && node.text !== 'undefined' && node.text !== 'null') {
      return node.text;
    }

    return 'Unknown_Name';
  }
}
