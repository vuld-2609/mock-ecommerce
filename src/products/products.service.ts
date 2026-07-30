import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MetaDto } from '@/common/dto/meta-dto';
import { PrismaService } from '@/prisma/prisma.service';
import { t } from '@/utils/i18n.util';

import { GetProductsQueryDto } from './dto/get-products-query-dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prismaService: PrismaService) {}

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
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prismaService.product.count({ where }),
    ]);

    return {
      message: t('common.success.get_products'),
      data: products,
      meta: new MetaDto({ total, page, limit }),
    };
  }
}
