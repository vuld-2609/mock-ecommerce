import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ChangePWDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.old_password_required') })
  oldPassword: string;

  @ApiProperty({ example: 'newPassword123', minLength: 6 })
  @IsString()
  @MinLength(6, {
    message: i18nValidationMessage('validation.new_password_min_length', { min: 6 }),
  })
  newPassword: string;
}
