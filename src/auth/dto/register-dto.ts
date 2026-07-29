import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: i18nValidationMessage('validation.email_invalid') })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.password_required') })
  @MinLength(6, { message: i18nValidationMessage('validation.password_min_length', { min: 6 }) })
  password: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.full_name_required') })
  fullName: string;
}
