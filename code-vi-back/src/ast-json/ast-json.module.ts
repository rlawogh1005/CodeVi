import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AstJsonService } from './ast-json.service';
import { AstJsonController } from './ast-json.controller';
import { AstJsonData } from './entity/ast-json-data.entity';
import { TeamProject } from 'src/team-project/entities/team-project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AstJsonData, TeamProject])],
  controllers: [AstJsonController],
  providers: [AstJsonService],
  exports: [AstJsonService],
})
export class AstJsonModule {}
