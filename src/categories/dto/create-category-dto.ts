import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Điện thoại' })
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.category_name_required') })
  name: string;

  @ApiProperty({ example: 'Danh mục điện thoại các loại' })
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.category_description_required') })
  description: string;
}
