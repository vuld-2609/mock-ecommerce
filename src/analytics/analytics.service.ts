import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { endOfMonth, startOfMonth } from 'date-fns';

import { PrismaService } from '@/prisma/prisma.service';
import { ProductsService } from '@/products/products.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  async getDashboard(month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const startDate = startOfMonth(new Date(targetYear, targetMonth - 1));
    const endDate = endOfMonth(startDate);

    const [revenue, topProducts] = await Promise.all([
      this.getRevenueStats(startDate, endDate),
      this.getTopSellingProducts(startDate, endDate),
    ]);

    return { month: targetMonth, year: targetYear, ...revenue, topProducts };
  }

  async getRevenueStats(startDate: Date, endDate: Date) {
    const result = await this.prismaService.order.aggregate({
      _sum: { totalAmount: true },
      _count: { id: true },
      where: {
        status: OrderStatus.COMPLETED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      totalOrders: result._count.id,
      totalRevenue: Number(result._sum.totalAmount ?? 0),
    };
  }

  async getTopSellingProducts(startDate: Date, endDate: Date, limit = 5) {
    const topProducts = await this.prismaService.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      where: {
        order: {
          status: OrderStatus.COMPLETED,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const productIds = topProducts.map((item) => item.productId);
    const products = await this.prismaService.product.findMany({
      where: { id: { in: productIds } },
    });

    return Promise.all(
      topProducts.map(async (item) => {
        const product = products.find((product) => product.id === item.productId);
        const thumbnail = product
          ? (await this.productsService.getProductImages(product.id)).thumbnail
          : null;

        return {
          productId: item.productId,
          productName: product?.name ?? 'N/A',
          thumbnail,
          totalSold: item._sum.quantity ?? 0,
        };
      }),
    );
  }
}
