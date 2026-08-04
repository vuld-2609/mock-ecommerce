import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AddToCartDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: i18nValidationMessage('validation.product_id_invalid') })
  productId: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: i18nValidationMessage('validation.quantity_invalid') })
  @Min(1, { message: i18nValidationMessage('validation.quantity_invalid') })
  quantity: number;
}
