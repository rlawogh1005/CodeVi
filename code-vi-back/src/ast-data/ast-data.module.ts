import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AstDataService } from './ast-data.service';
import { AstDataController } from './ast-data.controller';
import { AstData } from './entity/ast-data.entity';
import { TeamProject } from 'src/team-project/entities/team-project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AstData, TeamProject])],
  controllers: [AstDataController],
  providers: [AstDataService],
})
export class AstDataModule {}
