import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global validation pipe for DTO validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Enable CORS for frontend communication
    const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim());
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });

    const port = process.env.API_PORT || 3001;
    await app.listen(port);
    console.log(`🚀 Zyllen API running on http://localhost:${port}`);
}

bootstrap();
