import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '@/prisma/prisma.service';

import { FileableType } from './fileable-type.constant';

@Injectable()
export class FileService {
  constructor(private readonly prisma: PrismaService) {}

  async getFile(fileableType: FileableType, fileableId: number) {
    return this.prisma.file.findFirst({
      where: { fileableType, fileableId },
    });
  }

  async getFiles(fileableType: FileableType, fileableId: number) {
    return this.prisma.file.findMany({
      where: { fileableType, fileableId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addFile(
    tx: Prisma.TransactionClient,
    file: Express.Multer.File,
    fileableType: FileableType,
    fileableId: number,
    associationType: string,
  ) {
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
  }

  async replaceFile(
    tx: Prisma.TransactionClient,
    file: Express.Multer.File,
    fileableType: FileableType,
    fileableId: number,
    associationType: string,
  ) {
    const oldFile = await tx.file.findFirst({ where: { fileableType, fileableId } });

    if (oldFile) {
      await tx.file.delete({ where: { id: oldFile.id } });
    }

    const newFile = await this.addFile(tx, file, fileableType, fileableId, associationType);

    const cleanup = () => {
      if (oldFile) this.unlinkPhysicalFile(oldFile.path);
    };

    return { file: newFile, cleanup };
  }

  async removeFile(tx: Prisma.TransactionClient, fileId: number) {
    const file = await tx.file.delete({ where: { id: fileId } });

    const cleanup = () => this.unlinkPhysicalFile(file.path);

    return { file, cleanup };
  }

  async removeFilesByOwner(
    tx: Prisma.TransactionClient,
    fileableType: FileableType,
    fileableId: number,
  ) {
    const files = await tx.file.findMany({ where: { fileableType, fileableId } });
    await tx.file.deleteMany({ where: { fileableType, fileableId } });

    const cleanup = () => files.forEach((file) => this.unlinkPhysicalFile(file.path));

    return { files, cleanup };
  }

  private unlinkPhysicalFile(filePath: string): void {
    const absolutePath = path.join(process.cwd(), filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }

  private toPublicPath(file: Express.Multer.File): string {
    const relativePath = path.join(file.destination, file.filename).replace(/^\.[/\\]?/, '');
    return `/${relativePath}`;
  }
}
