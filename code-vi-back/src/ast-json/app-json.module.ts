import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TeamProjectModule } from '../team-project/team-project.module';
import { CodeAnalysisModule } from '../code-analysis/code-analysis.module';
import { MetricModule } from '../metric/metric.module';
import { AstJsonModule } from './ast-json.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const,
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/../**/*.entity.{js,ts}'],
        synchronize: true,
        logging: true,
      }),
    }),
    AuthModule,
    UsersModule,
    TeamProjectModule,
    CodeAnalysisModule,
    MetricModule,
    AstJsonModule,
  ],
})
export class AppJsonModule { }
