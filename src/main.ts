import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: 'http://localhost:3001', // domain cua FE
    credentials: true, //cho phép gửi kèm cookie/credentials qua request cross-origin (sẽ cần dùng khi nâng cấp lên httpOnly Cookie sau này).
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
