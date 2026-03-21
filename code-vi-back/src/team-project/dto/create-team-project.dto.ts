import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCodeAnalysisDto } from '../../code-analysis/dto/create-code-analysis.dto';

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

  // [LEGACY] AST 데이터는 이제 /api/ast-data/relational 엔드포인트를 통해 별도 저장
  astData?: any;
}
