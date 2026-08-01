import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2 })
  @IsInt({ message: i18nValidationMessage('validation.quantity_invalid') })
  @Min(1, { message: i18nValidationMessage('validation.quantity_invalid') })
  quantity: number;
}
