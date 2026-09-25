import { BadRequestException } from '@nestjs/common';
import { createWriteStream } from 'fs';
import { mkdir, rename, unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { StorageEngine } from 'multer';

export function mediaUploadDirectory(...segments: string[]) {
    return join(process.env.MEDIA_UPLOAD_ROOT || resolve(__dirname, '../../..', 'uploads'), ...segments);
}

/** Content classification, not a claim that a file is malware-free. Never execute uploads. */
export function detectMedia(bytes: Buffer): { ext: string; mime: string } | null {
    if (bytes.length < 12) return null;
    if (/^%PDF-[12]\.[0-9]/.test(bytes.toString('ascii', 0, 8))) return { ext: '.pdf', mime: 'application/pdf' };
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { ext: '.png', mime: 'image/png' };
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { ext: '.jpg', mime: 'image/jpeg' };
    if (/^GIF8[79]a/.test(bytes.toString('ascii', 0, 6))) return { ext: '.gif', mime: 'image/gif' };
    if (bytes.toString('ascii', 0, 4) === 'RIFF') {
        if (bytes.toString('ascii', 8, 12) === 'WEBP') return { ext: '.webp', mime: 'image/webp' };
        if (bytes.toString('ascii', 8, 12) === 'AVI ') return { ext: '.avi', mime: 'video/x-msvideo' };
    }
    if (bytes.toString('ascii', 0, 2) === 'BM' && bytes.length >= 26) return { ext: '.bmp', mime: 'image/bmp' };
    if (bytes.toString('ascii', 4, 8) === 'ftyp') {
        const brand = bytes.toString('ascii', 8, 12);
        if (brand === 'qt  ') return { ext: '.mov', mime: 'video/quicktime' };
        if (/^(isom|iso[2-9]|mp4[12]|M4V |MSNV|avc1|dash)$/.test(brand)) return { ext: '.mp4', mime: 'video/mp4' };
    }
    if (bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])) && bytes.includes(Buffer.from('webm'))) return { ext: '.webm', mime: 'video/webm' };
    return null;
}

interface VerifiedMediaLimits {
    imageBytes?: number;
    videoBytes?: number;
    pdfBytes?: number;
}

/** Writes to a private temporary name; the final extension/MIME come from bytes, never originalname. */
export function verifiedMediaStorage(
    directory: string,
    allowPdf = false,
    limits: VerifiedMediaLimits = {},
): StorageEngine {
    const imageLimit = limits.imageBytes ?? 20 * 1024 * 1024;
    const videoLimit = limits.videoBytes ?? 20 * 1024 * 1024;
    const pdfLimit = limits.pdfBytes ?? 20 * 1024 * 1024;
    const streamLimit = Math.max(imageLimit, videoLimit, allowPdf ? pdfLimit : 0);
    return {
        _handleFile(_req, file, callback) {
            void (async () => {
                await mkdir(directory, { recursive: true });
                const base = randomUUID();
                const temporary = join(directory, `${base}.upload`);
                let size = 0;
                let header = Buffer.alloc(0);
                try {
                    await pipeline(file.stream, new Transform({ transform(chunk: Buffer, _encoding, done) {
                        size += chunk.length;
                        if (header.length < 4096) header = Buffer.concat([header, chunk.subarray(0, 4096 - header.length)]);
                        done(size > streamLimit ? new BadRequestException('Arquivo excede o limite permitido') : null, chunk);
                    } }), createWriteStream(temporary, { flags: 'wx' }));
                    if ((file.stream as typeof file.stream & { truncated?: boolean }).truncated) throw new BadRequestException('Arquivo excede o limite');
                    const detected = detectMedia(header);
                    if (!detected || (detected.mime === 'application/pdf' && !allowPdf)) throw new BadRequestException('Conteúdo inválido. Envie um arquivo em formato permitido.');
                    const detectedLimit = detected.mime.startsWith('video/')
                        ? videoLimit
                        : detected.mime === 'application/pdf'
                            ? pdfLimit
                            : imageLimit;
                    if (size > detectedLimit) {
                        throw new BadRequestException(
                            `Arquivo excede ${Math.floor(detectedLimit / 1024 / 1024)} MB`,
                        );
                    }
                    const filename = `${base}${detected.ext}`;
                    const target = join(directory, filename);
                    await rename(temporary, target);
                    file.mimetype = detected.mime;
                    callback(null, { destination: directory, filename, path: target, size, mimetype: detected.mime });
                } catch (error) {
                    await unlink(temporary).catch(() => undefined);
                    callback(error as Error);
                }
            })().catch(error => callback(error));
        },
        _removeFile(_req, file, callback) { unlink(file.path).then(() => callback(null), error => callback(error)); },
    };
}
