import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import type { ValidationError } from 'class-validator';
import { AppModule } from './app.module.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { formatValidationErrors } from './common/utils/validation.util.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.enableCors({
    origin: true,
    credentials: true,
  });
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        return new BadRequestException(formatValidationErrors(errors));
      },
    }),
  );
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
await bootstrap();

