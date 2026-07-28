import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token nhận được trong email đặt lại mật khẩu' })
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.token_required') })
  token: string;

  @ApiProperty({ example: 'newPassword123', minLength: 6 })
  @IsString()
  @MinLength(6, {
    message: i18nValidationMessage('validation.new_password_min_length', { min: 6 }),
  })
  newPassword: string;
}
