import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

import { AuthService } from '@/auth/auth.service';
import { SafeUser } from '@/auth/types/authenticated-user.type';
import { FileService } from '@/file/file.service';
import { PrismaService } from '@/prisma/prisma.service';
import { t } from '@/utils/i18n.util';

import { ChangePWDto } from './dto/change-pw-dto';
import { ProfileResponseDto } from './dto/profile-res-dto';
import { UpdateProfileDto } from './dto/update-profile-dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly fileService: FileService,
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async getMe(user: SafeUser) {
    const avatarFile = await this.fileService.getFile('USER', user.id);

    return {
      message: t('common.success.get_profile'),
      data: new ProfileResponseDto({ ...user, avatar: avatarFile ? avatarFile.path : null }),
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto, file?: Express.Multer.File) {
    let cleanupOldAvatar: (() => void) | undefined;

    try {
      const { user, avatarFile } = await this.prismaService.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            ...dto,
          },
        });

        if (!file) {
          const avatarFile = await tx.file.findFirst({
            where: { fileableType: 'USER', fileableId: userId },
          });
          return { user, avatarFile };
        }

        const replaced = await this.fileService.replaceFile(tx, file, 'USER', userId, 'avatar');
        cleanupOldAvatar = replaced.cleanup;
        return { user, avatarFile: replaced.file };
      });

      cleanupOldAvatar?.();

      return {
        message: t('common.success.update_profile'),
        data: new ProfileResponseDto({ ...user, avatar: avatarFile ? avatarFile.path : null }),
      };
    } catch (error) {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  async changePassword(userId: number, dto: ChangePWDto) {
    const { oldPassword, newPassword } = dto;

    const user = await this.prismaService.user.findUniqueOrThrow({ where: { id: userId } });

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException(t('common.errors.invalid_old_password'));
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException(t('common.errors.same_password'));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      }),
      this.prismaService.refreshToken.deleteMany({ where: { userId } }),
    ]);

    const tokens = await this.authService.issueTokenPair(userId, user.email);

    return { message: t('common.success.change_password'), data: tokens };
  }
}
