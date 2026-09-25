export const OS_ATTACHMENT_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const OS_ATTACHMENT_VIDEO_MAX_BYTES = 80 * 1024 * 1024;
export const OS_ATTACHMENT_REQUEST_MAX_FILES = 10;

export const OS_ATTACHMENT_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
] as const;

export const OS_ATTACHMENT_VIDEO_MIME_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
] as const;

export const OS_ATTACHMENT_ACCEPT = [
    ...OS_ATTACHMENT_IMAGE_MIME_TYPES,
    ...OS_ATTACHMENT_VIDEO_MIME_TYPES,
].join(',');
