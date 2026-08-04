import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { CartService } from '@/cart/cart.service';
import { MetaDto } from '@/common/dto/meta-dto';
import { PrismaService } from '@/prisma/prisma.service';
import { t } from '@/utils/i18n.util';

import { GetOrderQueryDto } from './dto/get-order-query-dto';
import { OrderResponseDto } from './dto/order-response-dto';
import { UpdateOrderStatusDto } from './dto/update-order-status-dto';

interface OrderItemInput {
  productId: number;
  productName: string;
  price: Prisma.Decimal;
  quantity: number;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cartService: CartService,
  ) {}

  async createOrder(userId: number) {
    const cartItems = await this.cartService.getCartItemsForCheckout(userId);

    if (cartItems.length === 0) {
      throw new BadRequestException(t('common.errors.cart_empty'));
    }

    const productIds = cartItems.map((item) => item.productId);

    const order = await this.prismaService.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });

      if (products.length !== productIds.length) {
        throw new NotFoundException(t('common.errors.product_not_found'));
      }

      let totalAmount = 0;
      const orderItemsData: OrderItemInput[] = [];

      for (const cartItem of cartItems) {
        const product = products.find((product) => product.id === cartItem.productId)!;

        const stockUpdate = await tx.product.updateMany({
          where: { id: product.id, stockQuantity: { gte: cartItem.quantity } },
          data: { stockQuantity: { decrement: cartItem.quantity } },
        });

        if (stockUpdate.count === 0) {
          throw new BadRequestException(t('common.errors.insufficient_stock'));
        }

        orderItemsData.push({
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: cartItem.quantity,
        });
        totalAmount += Number(product.price) * cartItem.quantity;
      }

      return tx.order.create({
        data: {
          orderCode: randomUUID(),
          userId,
          totalAmount,
          orderItems: { createMany: { data: orderItemsData } },
        },
        include: { orderItems: true },
      });
    });

    await this.cartService.clearCart(userId);

    return {
      message: t('common.success.create_order'),
      data: new OrderResponseDto(order),
    };
  }

  async getOrders(userId: number, query: GetOrderQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { userId };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prismaService.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { orderItems: true } } },
      }),
      this.prismaService.order.count({ where }),
    ]);

    const data = orders.map((order) => ({
      orderId: order.id,
      orderCode: order.orderCode,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      createdAt: order.createdAt,
      totalItem: order._count.orderItems,
    }));

    return {
      message: t('common.success.get_orders'),
      data,
      meta: new MetaDto({ total, page, limit }),
    };
  }

  async getOrderDetail(userId: number, orderId: number) {
    const order = await this.findOrderWithItemsOrThrow(userId, orderId);

    return {
      message: t('common.success.get_order_detail'),
      data: new OrderResponseDto(order),
    };
  }

  async cancelOrder(userId: number, orderId: number) {
    const order = await this.findOrderOrThrow(userId, orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(t('common.errors.order_cannot_be_cancelled'));
    }

    await this.cancelOrderAndRestoreStock(orderId);

    return {
      message: t('common.success.cancel_order'),
      data: { orderId, status: OrderStatus.CANCELLED },
    };
  }

  async updateOrderStatus(orderId: number, dto: UpdateOrderStatusDto) {
    const order = await this.prismaService.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException(t('common.errors.order_not_found'));
    }

    if (dto.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      await this.cancelOrderAndRestoreStock(orderId, dto.rejectReason);
    } else {
      await this.prismaService.order.update({
        where: { id: orderId },
        data: { status: dto.status },
      });
    }

    return { message: t('common.success.update_order_status') };
  }

  private async cancelOrderAndRestoreStock(orderId: number, rejectReason?: string) {
    await this.prismaService.$transaction(async (tx) => {
      const orderItems = await tx.orderItem.findMany({ where: { orderId } });

      await Promise.all(
        orderItems.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          }),
        ),
      );

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED, rejectReason },
      });
    });
  }

  private async findOrderOrThrow(userId: number, orderId: number) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException(t('common.errors.order_not_found'));
    }

    return order;
  }

  private async findOrderWithItemsOrThrow(userId: number, orderId: number) {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId, userId },
      include: { orderItems: true },
    });

    if (!order) {
      throw new NotFoundException(t('common.errors.order_not_found'));
    }

    return order;
  }
}
