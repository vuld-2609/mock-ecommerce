import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { diskStorage, FileFilterCallback } from 'multer';
import { extname } from 'path';

import { t } from '@/utils/i18n.util';

const DEFAULT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIME_TYPES = /\/(jpg|jpeg|png|gif|webp)$/;

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;

export function createImageUploadOptions(
  uploadDir: string,
  filePrefix: string,
  maxSizeBytes = DEFAULT_MAX_IMAGE_SIZE_BYTES,
) {
  return {
    storage: diskStorage({
      destination: (_req: Express.Request, _file: Express.Multer.File, cb: DestinationCallback) => {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (_req: Express.Request, file: Express.Multer.File, cb: FilenameCallback) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = extname(file.originalname);
        cb(null, `${filePrefix}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      if (ALLOWED_IMAGE_MIME_TYPES.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(t('common.errors.invalid_image_type')));
      }
    },
    limits: {
      fileSize: maxSizeBytes,
    },
  };
}

export const AVATAR_UPLOAD_DIR = './uploads/avatars';
export const multerOptions = createImageUploadOptions(AVATAR_UPLOAD_DIR, 'avatar');

export const PRODUCT_UPLOAD_DIR = './uploads/products';
export const productImageMulterOptions = createImageUploadOptions(PRODUCT_UPLOAD_DIR, 'product');
