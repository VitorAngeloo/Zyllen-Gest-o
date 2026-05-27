import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Parse httpOnly cookies (used for refresh token)
    app.use(cookieParser());

    // API versioning via X-API-Version header — non-breaking, opt-in per controller
    app.enableVersioning({ type: VersioningType.HEADER, header: 'X-API-Version' });

    // Consistent error format for all exceptions
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Add success: true to all successful responses without altering existing shape
    app.useGlobalInterceptors(new ResponseInterceptor());

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
