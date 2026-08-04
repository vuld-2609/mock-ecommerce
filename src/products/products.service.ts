import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { File, Prisma, Product } from '@prisma/client';

import { ImageAssociationType } from '@/common/constant';
import { MetaDto } from '@/common/dto/meta-dto';
import {
  isForeignKeyConstraintError,
  isUniqueConstraintError,
} from '@/common/utils/prisma-error.util';
import { slugify } from '@/common/utils/slugify.util';
import { FileService } from '@/file/file.service';
import { FileableType } from '@/file/fileable-type.constant';
import { PrismaService } from '@/prisma/prisma.service';
import { t } from '@/utils/i18n.util';

import { CreateProductDto } from './dto/create-product-dto';
import { GetProductsQueryDto } from './dto/get-products-query-dto';
import { ProductResponseDto } from './dto/product-response-dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService,
  ) {}

  async getProducts(query: GetProductsQueryDto) {
    const { page = 1, limit = 10, q, categoryId, minPrice, maxPrice, inStockOnly } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (categoryId !== undefined) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (inStockOnly) {
      where.stockQuantity = { gt: 0 };
    }

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.product.count({ where }),
    ]);

    const data = await Promise.all(products.map((product) => this.toResponseDto(product)));

    return {
      message: t('common.success.get_products'),
      data,
      meta: new MetaDto({ total, page, limit }),
    };
  }

  async getProduct(id: number) {
    const product = await this.findProductOrThrow(id);

    return {
      message: t('common.success.get_product'),
      data: await this.toResponseDto(product),
    };
  }

  async createProduct(dto: CreateProductDto, files: Express.Multer.File[] = []) {
    try {
      const product = await this.prismaService.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: { ...dto, slug: slugify(dto.name) },
        });

        await Promise.all(
          files.map((file, index) =>
            this.fileService.addFile(
              tx,
              file,
              FileableType.PRODUCT,
              product.id,
              index === 0 ? ImageAssociationType.THUMBNAIL : ImageAssociationType.GALLERY,
            ),
          ),
        );

        return product;
      });

      return {
        message: t('common.success.create_product'),
        data: new ProductResponseDto(product, await this.getProductImages(product.id)),
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(t('common.errors.product_name_exists'));
      }
      throw error;
    }
  }

  async updateProduct(id: number, dto: CreateProductDto, files: Express.Multer.File[] = []) {
    await this.findProductOrThrow(id);

    try {
      const product = await this.prismaService.$transaction(async (tx) => {
        const product = await tx.product.update({
          where: { id },
          data: { ...dto, slug: slugify(dto.name) },
        });

        const hasThumbnail = await tx.file.findFirst({
          where: {
            fileableType: FileableType.PRODUCT,
            fileableId: id,
            associationType: ImageAssociationType.THUMBNAIL,
          },
        });

        await Promise.all(
          files.map((file, index) =>
            this.fileService.addFile(
              tx,
              file,
              FileableType.PRODUCT,
              id,
              !hasThumbnail && index === 0
                ? ImageAssociationType.THUMBNAIL
                : ImageAssociationType.GALLERY,
            ),
          ),
        );

        return product;
      });

      return {
        message: t('common.success.update_product'),
        data: new ProductResponseDto(product, await this.getProductImages(id)),
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(t('common.errors.product_name_exists'));
      }
      throw error;
    }
  }

  async deleteProductImage(productId: number, fileId: number) {
    await this.findProductOrThrow(productId);

    const { cleanup } = await this.prismaService.$transaction(async (tx) => {
      const image = await tx.file.findFirst({
        where: { id: fileId, fileableType: FileableType.PRODUCT, fileableId: productId },
      });

      if (!image) {
        throw new NotFoundException(t('common.errors.product_image_not_found'));
      }

      const { cleanup } = await this.fileService.removeFile(tx, fileId);

      if (image.associationType === ImageAssociationType.THUMBNAIL) {
        const nextImage = await tx.file.findFirst({
          where: { fileableType: FileableType.PRODUCT, fileableId: productId },
          orderBy: { createdAt: 'asc' },
        });

        if (nextImage) {
          await tx.file.update({
            where: { id: nextImage.id },
            data: { associationType: ImageAssociationType.THUMBNAIL },
          });
        }
      }

      return { cleanup };
    });

    cleanup();

    return {
      message: t('common.success.delete_product_image'),
      data: await this.getProductImages(productId),
    };
  }

  async deleteProduct(id: number) {
    await this.findProductOrThrow(id);

    try {
      const { cleanup } = await this.prismaService.$transaction(async (tx) => {
        await tx.product.delete({ where: { id } });
        return this.fileService.removeFilesByOwner(tx, FileableType.PRODUCT, id);
      });

      cleanup();
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw new ConflictException(t('common.errors.product_in_use'));
      }
      throw error;
    }

    return { message: t('common.success.delete_product') };
  }

  private async toResponseDto(product: Product) {
    return new ProductResponseDto(product, await this.getProductImages(product.id));
  }

  async getProductImages(productId: number) {
    const files = await this.fileService.getFiles(FileableType.PRODUCT, productId);
    const thumbnailFile = files.find(
      (file) => file.associationType === ImageAssociationType.THUMBNAIL,
    );

    return {
      thumbnail: thumbnailFile?.path ?? files[0]?.path ?? null,
      images: files.map((file: File) => file.path),
    };
  }

  private async findProductOrThrow(id: number) {
    const product = await this.prismaService.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException(t('common.errors.product_not_found'));
    }

    return product;
  }
}
