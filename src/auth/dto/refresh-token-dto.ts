import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token nhận được lúc login' })
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.refresh_token_required') })
  refreshToken: string;
}
