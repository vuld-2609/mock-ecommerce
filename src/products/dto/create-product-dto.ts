import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro Max' })
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.product_name_required') })
  name: string;

  @ApiProperty({ example: 'Điện thoại iPhone 15 Pro Max 256GB' })
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.product_description_required') })
  description: string;

  @ApiProperty({ example: 29990000 })
  @Type(() => Number)
  @IsNumber({}, { message: i18nValidationMessage('validation.product_price_invalid') })
  @Min(0, { message: i18nValidationMessage('validation.product_price_invalid') })
  price: number;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.product_stock_quantity_invalid') })
  @Min(0, { message: i18nValidationMessage('validation.product_stock_quantity_invalid') })
  stockQuantity: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.product_category_id_invalid') })
  categoryId: number;
}
