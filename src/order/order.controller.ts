import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import type { SafeUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';

import { GetOrderQueryDto } from './dto/get-order-query-dto';
import { UpdateOrderStatusDto } from './dto/update-order-status-dto';
import { OrderService } from './order.service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  createOrder(@CurrentUser() user: SafeUser) {
    return this.orderService.createOrder(user.id);
  }

  @Get()
  getOrders(@CurrentUser() user: SafeUser, @Query() query: GetOrderQueryDto) {
    return this.orderService.getOrders(user.id, query);
  }

  @Get(':id')
  getOrderDetail(@CurrentUser() user: SafeUser, @Param('id', ParseIntPipe) orderId: number) {
    return this.orderService.getOrderDetail(user.id, orderId);
  }

  @Patch(':id/cancel')
  cancelOrder(@CurrentUser() user: SafeUser, @Param('id', ParseIntPipe) orderId: number) {
    return this.orderService.cancelOrder(user.id, orderId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/status')
  updateOrderStatus(@Param('id', ParseIntPipe) orderId: number, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateOrderStatus(orderId, dto);
  }
}
