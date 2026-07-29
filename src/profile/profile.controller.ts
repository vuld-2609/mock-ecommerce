import {
  Body,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

import type { SafeUser } from '@/auth/types/authenticated-user.type';
import { multerOptions } from '@/config/multer.config';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

import { ChangePWDto } from './dto/change-pw-dto';
import { UpdateProfileDto } from './dto/update-profile-dto';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getCurrentUser(@CurrentUser() user: SafeUser) {
    return this.profileService.getMe(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  @UseInterceptors(FileInterceptor('avatar', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'Nguyen Van A' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  updateProfile(
    @CurrentUser() user: SafeUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileService.updateProfile(user.id, dto, file);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(@CurrentUser() user: SafeUser, @Body() dto: ChangePWDto) {
    return this.profileService.changePassword(user.id, dto);
  }
}
