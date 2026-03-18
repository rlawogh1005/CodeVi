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
