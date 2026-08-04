import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PAID })
  @IsEnum(OrderStatus, { message: i18nValidationMessage('validation.order_status_invalid') })
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Sản phẩm hết hàng' })
  @IsOptional()
  @IsString()
  rejectReason?: string;
}
