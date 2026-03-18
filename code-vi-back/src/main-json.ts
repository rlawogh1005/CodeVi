import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppJsonModule } from './ast-json/app-json.module';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import * as fs from 'fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const JSON_PORT = 13002;

async function bootstrap() {
  let httpsOptions: any = undefined;
  if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
    try {
      httpsOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
      };
    } catch (error) {
      Logger.error('SSL 키/인증서 파일 로딩 오류:', error);
    }
  } else {
    Logger.warn('SSL 키 또는 인증서 경로가 정의되지 않았습니다. HTTP로 실행합니다.');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppJsonModule, {
    httpsOptions,
  });

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost));

  app.use(bodyParser.json({ limit: '1000mb' }));
  app.use(bodyParser.urlencoded({ limit: '1000mb', extended: true }));

  const config = new DocumentBuilder()
    .setTitle('CodeVi API - JSON AST')
    .setDescription('AST 데이터를 JSON 통째로 저장하는 버전')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  app.setGlobalPrefix('api');

  // CORS 설정
  const allowedOrigins = [
    process.env.DEPLOY_FRONTEND_URL1,
    process.env.DEPLOY_FRONTEND_URL2,
    process.env.DEPLOY_FRONTEND_URL3,
    process.env.DEPLOY_FRONTEND_URL4,
    process.env.DEPLOY_FRONTEND_URL5,
    process.env.DEPLOY_FRONTEND_URL6,
    process.env.DEVELOP_FRONTEND_URL || 'http://localhost:4200',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-XSRF-TOKEN'],
    exposedHeaders: ['Authorization'],
  });

  const port = process.env.JSON_PORT || JSON_PORT;
  await app.listen(port, process.env.SERVER_HOST || '0.0.0.0');
  Logger.log(`📦 [JSON AST Server] Running on port ${port}`);
  Logger.log(`📄 Swagger: http://localhost:${port}/api-docs`);
}
bootstrap();
