import { Product } from '@prisma/client';

interface ProductImages {
  thumbnail: string | null;
  images: string[];
}

export class ProductResponseDto {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  stockQuantity: number;
  categoryId: number;
  thumbnail: string | null;
  images: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(product: Product, productImages: ProductImages = { thumbnail: null, images: [] }) {
    this.id = product.id;
    this.name = product.name;
    this.slug = product.slug;
    this.description = product.description;
    this.price = Number(product.price);
    this.stockQuantity = product.stockQuantity;
    this.categoryId = product.categoryId;
    this.thumbnail = productImages.thumbnail;
    this.images = productImages.images;
    this.createdAt = product.createdAt;
    this.updatedAt = product.updatedAt;
  }
}
