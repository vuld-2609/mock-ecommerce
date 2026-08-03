import { Module } from '@nestjs/common';

import { FileService } from '@/file/file.service';

import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, FileService],
})
export class ProductsModule {}
