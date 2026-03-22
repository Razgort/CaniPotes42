import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app/app.module.js';
import {
  AllExceptionsFilter,
  ResponseWrapperInterceptor,
  getCorsConfig,
} from '@org/api-core';
import { validateEnv } from '@org/utils';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate environment variables before anything else
  let env;
  try {
    env = validateEnv();
  } catch (error) {
    logger.error('Environment validation failed:');
    logger.error((error as Error).message);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors(getCorsConfig());

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global response wrapper
  app.useGlobalInterceptors(new ResponseWrapperInterceptor());

  // Swagger/OpenAPI — only in development
  if (env.SWAGGER_ENABLED) {
    const config = new DocumentBuilder()
      .setTitle('CaniFed API')
      .setDescription('Multi-club canine sports platform API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs available at /api/docs');
  }

  await app.listen(env.PORT);
  logger.log(
    `Application is running on: http://localhost:${env.PORT}/${globalPrefix}`
  );
}

bootstrap();
