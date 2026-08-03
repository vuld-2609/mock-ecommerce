import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { Roles } from '@/common/decorators/roles.decorator';
import { productImageMulterOptions } from '@/config/multer.config';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';

import { CreateProductDto } from './dto/create-product-dto';
import { GetProductsQueryDto } from './dto/get-products-query-dto';
import { ProductsService } from './products.service';

const MAX_PRODUCT_IMAGES = 10;

const PRODUCT_IMAGES_BODY_SCHEMA = {
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', example: 'iPhone 15 Pro Max' },
      description: { type: 'string', example: 'Điện thoại iPhone 15 Pro Max 256GB' },
      price: { type: 'number', example: 29990000 },
      stockQuantity: { type: 'number', example: 100 },
      categoryId: { type: 'number', example: 1 },
      images: { type: 'array', items: { type: 'string', format: 'binary' } },
    },
  },
};

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getProducts(@Query() query: GetProductsQueryDto) {
    return this.productsService.getProducts(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.getProduct(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @UseInterceptors(FilesInterceptor('images', MAX_PRODUCT_IMAGES, productImageMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody(PRODUCT_IMAGES_BODY_SCHEMA)
  createProduct(@Body() dto: CreateProductDto, @UploadedFiles() files: Express.Multer.File[] = []) {
    return this.productsService.createProduct(dto, files);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  @UseInterceptors(FilesInterceptor('images', MAX_PRODUCT_IMAGES, productImageMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody(PRODUCT_IMAGES_BODY_SCHEMA)
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.productsService.updateProduct(id, dto, files);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id/images/:fileId')
  deleteProductImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ) {
    return this.productsService.deleteProductImage(id, fileId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deleteProduct(id);
  }
}
