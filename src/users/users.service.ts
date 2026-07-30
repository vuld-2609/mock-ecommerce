import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MetaDto } from '@/common/dto/meta-dto';
import { PrismaService } from '@/prisma/prisma.service';
import { t } from '@/utils/i18n.util';

import { GetUsersQueryDto } from './dto/get-users-query-dto';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async getUsers(query: GetUsersQueryDto) {
    const { search, page = 1, limit = 10, isActive, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      message: t('common.success.get_users'),
      data: users,
      meta: new MetaDto({ limit, page, total }),
    };
  }

  async updateUser(userId: number, isActive: boolean) {
    try {
      const updatedUser = await this.prismaService.user.update({
        where: { id: userId },
        data: {
          isActive,
        },
      });

      return {
        message: t(isActive ? 'common.success.activate_user' : 'common.success.deactivate_user'),
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          isActive: updatedUser.isActive,
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(t('common.errors.user_not_found'));
      }
      throw error;
    }
  }
}
