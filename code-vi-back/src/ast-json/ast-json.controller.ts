import { Controller, Post, Body, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AstJsonService } from './ast-json.service';
import { CreateJsonAstDto } from './dto/create-json-ast.dto';

@ApiTags('AST Data (JSON Store)')
@Controller('ast-data/json')
export class AstJsonController {
  constructor(private readonly astJsonService: AstJsonService) { }

  @Post()
  @ApiOperation({ summary: 'AST 데이터를 JSON 통째로 저장' })
  @ApiResponse({ status: 201, description: 'AST 데이터가 JSON으로 저장됨' })
  async saveAstData(@Body() dto: CreateJsonAstDto) {
    return this.astJsonService.saveAstData(dto);
  }

  @Get()
  @ApiOperation({ summary: '전체 AST JSON 데이터 조회' })
  async getAllAstData() {
    return this.astJsonService.getAllAstData();
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 AST JSON 데이터 조회' })
  async getAstDataById(@Param('id', ParseIntPipe) id: number) {
    return this.astJsonService.getAstDataById(id);
  }
}
