import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJsonAstDto {
  @ApiProperty({ description: 'Jenkins Job Name to identify the project' })
  @IsString()
  @IsNotEmpty()
  jenkinsJobName: string;

  @ApiProperty({ description: 'AST 데이터 전체 (JSON 통째로 저장)' })
  @IsNotEmpty()
  nodes: any;
}
