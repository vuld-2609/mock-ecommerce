import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { SafeUser } from '@/auth/types/authenticated-user.type';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';

import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart-dto';
import { UpdateCartItemDto } from './dto/update-cart-item-dto';

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: SafeUser) {
    return this.cartService.getCart(user.id);
  }

  @Post()
  addToCart(@CurrentUser() user: SafeUser, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(user.id, dto.productId, dto.quantity);
  }

  @Patch(':productId')
  updateCartItem(
    @CurrentUser() user: SafeUser,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.id, productId, dto.quantity);
  }

  @Delete(':productId')
  removeCartItem(
    @CurrentUser() user: SafeUser,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.removeCartItem(user.id, productId);
  }

  @Delete()
  clearCart(@CurrentUser() user: SafeUser) {
    return this.cartService.clearCart(user.id);
  }
}
