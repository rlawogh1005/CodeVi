import { AstNodeDto } from './ast-node.dto';

export class CreateAstDataDto {
  teamProjectId: number;
  nodes: AstNodeDto[];
}
