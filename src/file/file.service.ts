import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class FileService {
  constructor(private readonly prisma: PrismaService) {}

  async getFile(fileableType: string, fileableId: number) {
    return this.prisma.file.findFirst({
      where: { fileableType, fileableId },
    });
  }

  async replaceFile(
    file: Express.Multer.File,
    fileableType: string,
    fileableId: number,
    associationType: string,
  ) {
    const oldFile = await this.getFile(fileableType, fileableId);

    const newFile = await this.prisma.$transaction(async (tx) => {
      if (oldFile) {
        await tx.file.delete({ where: { id: oldFile.id } });
      }

      return tx.file.create({
        data: {
          path: this.toPublicPath(file),
          fileName: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          fileableType,
          fileableId,
          associationType,
        },
      });
    });

    if (oldFile) {
      const absolutePath = path.join(process.cwd(), oldFile.path);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }

    return newFile;
  }

  private toPublicPath(file: Express.Multer.File): string {
    const relativePath = path.join(file.destination, file.filename).replace(/^\.[/\\]?/, '');
    return `/${relativePath}`;
  }
}
