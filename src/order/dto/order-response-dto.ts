import { Order, OrderItem, OrderStatus } from '@prisma/client';

interface OrderItemLine {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  itemTotalPrice: number;
}

export class OrderResponseDto {
  id: number;
  orderCode: string;
  status: OrderStatus;
  totalAmount: number;
  rejectReason: string | null;
  items: OrderItemLine[];
  createdAt: Date;

  constructor(order: Order & { orderItems: OrderItem[] }) {
    this.id = order.id;
    this.orderCode = order.orderCode;
    this.status = order.status;
    this.totalAmount = Number(order.totalAmount);
    this.rejectReason = order.rejectReason;
    this.items = order.orderItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      price: Number(item.price),
      quantity: item.quantity,
      itemTotalPrice: Number(item.price) * item.quantity,
    }));
    this.createdAt = order.createdAt;
  }
}
