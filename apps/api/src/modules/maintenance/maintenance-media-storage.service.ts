import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const SUPABASE_PREFIX = 'supabase:';

export type ServeSource =
    | { type: 'redirect'; url: string }
    | { type: 'local'; filePath: string };

@Injectable()
export class MaintenanceMediaStorageService {
    private readonly supabaseClient?: SupabaseClient;
    private readonly bucket: string;
    private readonly signedUrlExpiresIn: number;
    private readonly bucketIsPublic: boolean;

    constructor(private readonly configService: ConfigService) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

        this.bucket = this.configService.get<string>('SUPABASE_OS_MEDIA_BUCKET') || 'os-media';
        this.signedUrlExpiresIn = Math.max(
            60,
            parseInt(this.configService.get<string>('SUPABASE_OS_MEDIA_SIGNED_URL_EXPIRES') || '600', 10) || 600,
        );
        this.bucketIsPublic = (this.configService.get<string>('SUPABASE_OS_MEDIA_BUCKET_PUBLIC') || 'false').toLowerCase() === 'true';

        if (supabaseUrl && supabaseServiceRoleKey) {
            this.supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
                auth: { persistSession: false, autoRefreshToken: false },
            });
        }
    }

    private usesSupabase() {
        return !!this.supabaseClient;
    }

    async storeUploadedFile(file: Express.Multer.File, osId: string, localUploadDir: string): Promise<string> {
        if (!this.usesSupabase()) {
            return file.filename;
        }

        const sourcePath = file.path || join(localUploadDir, file.filename);
        const ext = extname(file.originalname) || extname(file.filename) || '.bin';
        const now = new Date();
        const yyyy = String(now.getUTCFullYear());
        const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
        const objectPath = `os/${osId}/${yyyy}/${mm}/${randomUUID()}${ext.toLowerCase()}`;

        try {
            const buffer = readFileSync(sourcePath);
            const { error } = await this.supabaseClient!.storage
                .from(this.bucket)
                .upload(objectPath, buffer, {
                    contentType: file.mimetype || undefined,
                    upsert: false,
                });

            if (error) {
                throw new InternalServerErrorException(`Falha ao enviar arquivo para storage: ${error.message}`);
            }

            return `${SUPABASE_PREFIX}${objectPath}`;
        } finally {
            if (existsSync(sourcePath)) {
                try {
                    unlinkSync(sourcePath);
                } catch {
                    // Ignore temp file cleanup failures.
                }
            }
        }
    }

    async resolveServeSource(filePath: string, localUploadDir: string): Promise<ServeSource> {
        if (!filePath.startsWith(SUPABASE_PREFIX)) {
            return { type: 'local', filePath: join(localUploadDir, filePath) };
        }

        if (!this.supabaseClient) {
            throw new InternalServerErrorException('Storage Supabase não configurado para servir anexo');
        }

        const objectPath = filePath.slice(SUPABASE_PREFIX.length);

        if (this.bucketIsPublic) {
            const { data } = this.supabaseClient.storage.from(this.bucket).getPublicUrl(objectPath);
            if (!data?.publicUrl) {
                throw new InternalServerErrorException('Falha ao gerar URL publica do anexo');
            }
            return { type: 'redirect', url: data.publicUrl };
        }

        const { data, error } = await this.supabaseClient.storage
            .from(this.bucket)
            .createSignedUrl(objectPath, this.signedUrlExpiresIn);

        if (error || !data?.signedUrl) {
            throw new InternalServerErrorException(`Falha ao gerar URL assinada do anexo: ${error?.message || 'erro desconhecido'}`);
        }

        return { type: 'redirect', url: data.signedUrl };
    }

    async deleteStoredFile(filePath: string, localUploadDir: string): Promise<void> {
        if (!filePath.startsWith(SUPABASE_PREFIX)) {
            const absolutePath = join(localUploadDir, filePath);
            if (existsSync(absolutePath)) {
                unlinkSync(absolutePath);
            }
            return;
        }

        if (!this.supabaseClient) {
            return;
        }

        const objectPath = filePath.slice(SUPABASE_PREFIX.length);
        const { error } = await this.supabaseClient.storage.from(this.bucket).remove([objectPath]);
        if (error) {
            throw new InternalServerErrorException(`Falha ao remover arquivo do storage: ${error.message}`);
        }
    }
}
