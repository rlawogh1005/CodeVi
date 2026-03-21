import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AstSnapshot } from './entity/ast-snapshot.entity';
import { AstDirectory } from './entity/ast-directory.entity';
import { AstFile } from './entity/ast-file.entity';
import { AstClass } from './entity/ast-class.entity';
import { AstFunction } from './entity/ast-function.entity';
import { TeamProject } from 'src/team-project/entities/team-project.entity';
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

    // 1. 트랜잭션 블록 안에서는 저장만 하고 ID를 반환받습니다.
    const newSnapshotId = await this.dataSource.transaction(async (manager) => {
      // 1) 스냅샷 생성
      const snapshot = manager.create(AstSnapshot, {
        teamProjectId: project.id,
      });
      const savedSnapshot = await manager.save(snapshot);

      // 2) 재귀적으로 노드들을 저장
      for (const node of nodes) {
        await this.processNode(manager, node, savedSnapshot.id, null);
      }

      this.logger.log(`Relational AST saved: snapshotId=${savedSnapshot.id}, project=${jenkinsJobName}`);

      // 조회하지 않고 생성된 ID만 리턴 (이 시점에 트랜잭션 커밋 완료)
      return savedSnapshot.id;
    });

    // 2. 트랜잭션이 안전하게 커밋된 이후에 조회를 실행합니다.
    return this.getSnapshotById(newSnapshotId);
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

    // 3. JSON에서 소문자로 넘어오는 타입 처리를 위해 대문자로 통일합니다.
    const nodeType = node.type ? node.type.toUpperCase() : '';

    const nodeName = this.extractNodeName(node);
    if (nodeType.includes('CLASS') || nodeType.includes('FUNC') || nodeType.includes('METHOD')) {
      this.logger.debug(`👀 Found target node! Actual Type: [${nodeType}], Name: [${nodeName}], FileID: ${fileId}`);
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
          name: nodeName, // 파일 노드는 name 속성이 있으니 그대로 씁니다.
          directoryId: parentDirectoryId,
        });
        const savedFile = await manager.save(file);

        // ✅ 수정 완료: 파일의 경우 node.ast 객체로 진입해야 합니다!
        if (node.ast) {
          // ast 자체도 하나의 노드(module)이므로 통째로 넘겨서 재귀를 태웁니다.
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
        // 경고 로그는 너무 많이 찍힐 수 있으므로 debug 수준으로 낮추거나 주석 처리하는 것을 권장합니다.
        // this.logger.warn(`Unknown node type: ${node.type}, name: ${node.name}`);

        // 관심 없는 노드라도, 그 하위에 클래스나 함수가 있을 수 있으므로 계속 탐색합니다.
        if (node.children) {
          for (const child of node.children) {
            // 부모의 컨텍스트(snapshotId, parentDirectoryId, fileId, classId)를 그대로 물려주며 내려갑니다.
            await this.processNode(manager, child, snapshotId, parentDirectoryId, fileId, classId);
          }
        }
        break;
    }
  }

  /**
   * 특정 스냅샷을 전체 관계와 함께 조회
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
   * JOIN 방식: QueryBuilder의 leftJoinAndSelect를 체이닝하여
   * 하나의 SQL로 전체 트리를 조회합니다.
   */
  async getSnapshotByNaturalJoin(snapshotId: number): Promise<AstSnapshot> {
    const snapshot = await this.snapshotRepo
      .createQueryBuilder('snapshot')
      .leftJoinAndSelect('snapshot.directories', 'dir')
      .leftJoinAndSelect('dir.files', 'file')
      .leftJoinAndSelect('file.classes', 'cls')
      .leftJoinAndSelect('cls.methods', 'method')
      .leftJoinAndSelect('file.fileFunctions', 'fileFn')
      .where('snapshot.id = :id', { id: snapshotId })
      .getOne();

    if (!snapshot) {
      throw new NotFoundException(`Snapshot not found: ${snapshotId}`);
    }

    return snapshot;
  }

  /**
   * Nested SQL (서브쿼리) 방식: 각 계층을 개별 쿼리로 조회하고,
   * WHERE 절에 서브쿼리를 사용하여 상위 엔티티의 ID를 동적으로 참조합니다.
   * 결과는 코드에서 조립합니다.
   */
  async getSnapshotByNested(snapshotId: number): Promise<AstSnapshot> {
    // 1) 스냅샷 단건 조회
    const snapshot = await this.snapshotRepo
      .createQueryBuilder('snapshot')
      .where('snapshot.id = :id', { id: snapshotId })
      .getOne();

    if (!snapshot) {
      throw new NotFoundException(`Snapshot not found: ${snapshotId}`);
    }

    // 2) 디렉토리 조회 — 서브쿼리로 snapshotId 매칭
    const directories = await this.directoryRepo
      .createQueryBuilder('dir')
      .where(
        'dir.snapshotId IN (' +
        this.snapshotRepo
          .createQueryBuilder('s')
          .select('s.id')
          .where('s.id = :id')
          .getQuery() +
        ')',
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 3) 파일 조회 — 서브쿼리로 해당 스냅샷의 directoryIds 매칭
    const files = await this.fileRepo
      .createQueryBuilder('file')
      .where(
        'file.directoryId IN (' +
        this.directoryRepo
          .createQueryBuilder('d')
          .select('d.id')
          .where('d.snapshotId = :id')
          .getQuery() +
        ')',
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 4) 클래스 조회 — 서브쿼리로 해당 스냅샷의 fileIds 매칭
    const classes = await this.classRepo
      .createQueryBuilder('cls')
      .where(
        'cls.fileId IN (' +
        this.fileRepo
          .createQueryBuilder('f')
          .select('f.id')
          .where(
            'f.directoryId IN (' +
            this.directoryRepo
              .createQueryBuilder('d2')
              .select('d2.id')
              .where('d2.snapshotId = :id')
              .getQuery() +
            ')',
          )
          .getQuery() +
        ')',
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 5) 함수 조회 — 파일 레벨 함수 + 클래스 메서드 모두
    const functions = await this.functionRepo
      .createQueryBuilder('fn')
      .where(
        'fn.fileId IN (' +
        this.fileRepo
          .createQueryBuilder('f2')
          .select('f2.id')
          .where(
            'f2.directoryId IN (' +
            this.directoryRepo
              .createQueryBuilder('d3')
              .select('d3.id')
              .where('d3.snapshotId = :id')
              .getQuery() +
            ')',
          )
          .getQuery() +
        ')',
      )
      .orWhere(
        'fn.classId IN (' +
        this.classRepo
          .createQueryBuilder('c2')
          .select('c2.id')
          .where(
            'c2.fileId IN (' +
            this.fileRepo
              .createQueryBuilder('f3')
              .select('f3.id')
              .where(
                'f3.directoryId IN (' +
                this.directoryRepo
                  .createQueryBuilder('d4')
                  .select('d4.id')
                  .where('d4.snapshotId = :id')
                  .getQuery() +
                ')',
              )
              .getQuery() +
            ')',
          )
          .getQuery() +
        ')',
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 6) 메모리에서 트리 조립
    // 클래스에 함수(메서드) 매핑
    const classMap = new Map<number, AstClass & { methods: AstFunction[] }>();
    for (const cls of classes) {
      classMap.set(cls.id, { ...cls, methods: [] });
    }
    for (const fn of functions) {
      if (fn.classId && classMap.has(fn.classId)) {
        classMap.get(fn.classId)!.methods.push(fn);
      }
    }

    // 파일에 클래스 + 파일 레벨 함수 매핑
    const fileMap = new Map<number, AstFile & { classes: any[]; fileFunctions: AstFunction[] }>();
    for (const file of files) {
      fileMap.set(file.id, { ...file, classes: [], fileFunctions: [] });
    }
    for (const [, cls] of classMap) {
      if (fileMap.has(cls.fileId)) {
        fileMap.get(cls.fileId)!.classes.push(cls);
      }
    }
    for (const fn of functions) {
      if (fn.fileId && !fn.classId && fileMap.has(fn.fileId)) {
        fileMap.get(fn.fileId)!.fileFunctions.push(fn);
      }
    }

    // 디렉토리에 파일 매핑
    const dirMap = new Map<number, AstDirectory & { files: any[] }>();
    for (const dir of directories) {
      dirMap.set(dir.id, { ...dir, files: [] });
    }
    for (const [, file] of fileMap) {
      if (dirMap.has(file.directoryId)) {
        dirMap.get(file.directoryId)!.files.push(file);
      }
    }

    // 스냅샷에 디렉토리 매핑
    snapshot.directories = Array.from(dirMap.values()) as any;

    return snapshot;
  }

  /**
   * 전체 스냅샷 목록 조회 (관계 포함)
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

  private extractNodeName(node: AstNodeInputDto): string {
    // 1. If name is directly provided (e.g., DIRECTORY, FILE), use it.
    if (node.name && node.name !== 'undefined' && node.name !== 'null') {
      return node.name;
    }

    // 2. If node has children, try to find a name-carrying child.
    if (node.children && Array.isArray(node.children)) {
      // Priority 1: Child with fieldName 'name'
      const nameNode = node.children.find((c) => c.fieldName === 'name');
      if (nameNode) {
        if (nameNode.text) return nameNode.text;
        if (nameNode.name) return nameNode.name;
      }

      // Priority 2: First child with type 'identifier' or containing 'identifier'
      const idNode = node.children.find((c) =>
        c.type && (c.type.toLowerCase().includes('identifier') || c.type.toLowerCase() === 'name')
      );
      if (idNode) {
        if (idNode.text) return idNode.text;
        if (idNode.name) return idNode.name;
      }
    }

    // 3. Fallback to node.text if available.
    if (node.text && node.text !== 'undefined' && node.text !== 'null') {
      return node.text;
    }

    // 4. Ultimate fallback to prevent DB error "Field 'name' doesn't have a default value".
    return 'Unknown_Name';
  }
}
