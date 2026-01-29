import { Controller, Post, Body, Get } from '@nestjs/common';
import { AstDataService } from './ast-data.service';
import { AstNodeDto } from './dto/ast-node.dto';
import { CreateAstDataDto } from './dto/ast-data-request.dto';

@Controller('ast-data')
export class AstDataController {
  constructor(private readonly astDataService: AstDataService) {}

  @Post()
  async saveAstData(@Body() createAstDataDto: CreateAstDataDto) {
    return this.astDataService.saveAstData(createAstDataDto);
  }

  @Get()
  async getAllAstData() {
    return this.astDataService.getAllAstData();
  }
}
