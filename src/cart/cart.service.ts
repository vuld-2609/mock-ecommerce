import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CART_TTL_30_DAYS } from '@/common/constant';
import { PrismaService } from '@/prisma/prisma.service';
import { ProductsService } from '@/products/products.service';
import { RedisService } from '@/redis/redis.service';
import { t } from '@/utils/i18n.util';

interface CartItem {
  productId: number;
  quantity: number;
}

@Injectable()
export class CartService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly productsService: ProductsService,
  ) {}

  async addToCart(userId: number, productId: number, quantity: number) {
    const product = await this.findProductOrThrow(productId);

    const key = this.getCartKey(userId);
    const cart = await this.getCartItems(key);
    const existingItem = cart.find((item) => item.productId === productId);
    const newQuantity = (existingItem?.quantity ?? 0) + quantity;

    this.assertStockAvailable(product.stockQuantity, newQuantity);

    if (existingItem) {
      existingItem.quantity = newQuantity;
    } else {
      cart.push({ productId, quantity });
    }

    await this.saveCartItems(key, cart);

    return { message: t('common.success.add_to_cart') };
  }

  async updateCartItem(userId: number, productId: number, quantity: number) {
    const product = await this.findProductOrThrow(productId);
    this.assertStockAvailable(product.stockQuantity, quantity);

    const key = this.getCartKey(userId);
    const cart = await this.getCartItems(key);
    const item = cart.find((item) => item.productId === productId);

    if (!item) {
      throw new NotFoundException(t('common.errors.cart_item_not_found'));
    }

    item.quantity = quantity;
    await this.saveCartItems(key, cart);

    return { message: t('common.success.update_cart') };
  }

  async getCart(userId: number) {
    const key = this.getCartKey(userId);
    const cart = await this.getCartItems(key);

    const products = await this.prismaService.product.findMany({
      where: { id: { in: cart.map((item) => item.productId) } },
    });

    const items = await Promise.all(
      cart.map(async (cartItem) => {
        const product = products.find((product) => product.id === cartItem.productId);
        if (!product) return null;

        const { thumbnail } = await this.productsService.getProductImages(product.id);
        const price = Number(product.price);
        const quantity = cartItem.quantity;

        return {
          productId: product.id,
          name: product.name,
          thumbnail,
          price,
          quantity,
          itemTotalPrice: price * quantity,
        };
      }),
    );

    const cartLines = items.filter((item): item is NonNullable<typeof item> => item !== null);
    const totalPrice = cartLines.reduce((sum, item) => sum + item.itemTotalPrice, 0);

    return {
      message: t('common.success.get_cart'),
      data: { items: cartLines, totalPrice },
    };
  }

  async removeCartItem(userId: number, productId: number) {
    const key = this.getCartKey(userId);
    const cart = await this.getCartItems(key);
    const remaining = cart.filter((item) => item.productId !== productId);

    if (remaining.length > 0) {
      await this.saveCartItems(key, remaining);
    } else {
      await this.redisService.del(key);
    }

    return { message: t('common.success.remove_cart_item') };
  }

  async clearCart(userId: number) {
    await this.redisService.del(this.getCartKey(userId));

    return { message: t('common.success.clear_cart') };
  }

  private getCartKey(userId: number): string {
    return `cart:user:${userId}`;
  }

  private async getCartItems(key: string): Promise<CartItem[]> {
    const raw = await this.redisService.get(key);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  }

  private async saveCartItems(key: string, items: CartItem[]): Promise<void> {
    await this.redisService.set(key, JSON.stringify(items), CART_TTL_30_DAYS);
  }

  private async findProductOrThrow(productId: number) {
    const product = await this.prismaService.product.findUnique({ where: { id: productId } });

    if (!product) {
      throw new NotFoundException(t('common.errors.product_not_found'));
    }

    return product;
  }

  private assertStockAvailable(stockQuantity: number, requestedQuantity: number): void {
    if (requestedQuantity > stockQuantity) {
      throw new BadRequestException(t('common.errors.insufficient_stock'));
    }
  }
}
