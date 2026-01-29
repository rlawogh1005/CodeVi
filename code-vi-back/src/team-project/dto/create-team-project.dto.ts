import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCodeAnalysisDto } from '../../code-analysis/dto/create-code-analysis.dto';
import { AstNodeDto } from 'src/ast-data/dto/ast-node.dto';

export class CreateTeamProjectAnalysisDto {
  @IsString()
  teamName: string;

  @IsString()
  jenkinsJobName: string;

  @IsString()
  sonarProjectKey: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CreateCodeAnalysisDto)
  analysis: CreateCodeAnalysisDto;

  // @IsObject()
  // @ValidateNested()
  // @Type(() => AstNodeDto)
  astData: { nodes: AstNodeDto[] };
}
