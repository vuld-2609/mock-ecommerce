import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { isUniqueConstraintError } from '@/common/utils/prisma-error.util';
import { PrismaService } from '@/prisma/prisma.service';
import { t } from '@/utils/i18n.util';

import { CategoryResponseDto } from './dto/category-response-dto';
import { CreateCategoryDto } from './dto/create-category-dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async getCategories() {
    const categories = await this.prismaService.category.findMany();

    return {
      message: t('common.success.get_categories'),
      data: categories.map((category) => new CategoryResponseDto(category)),
    };
  }

  async createCategory(dto: CreateCategoryDto) {
    try {
      const category = await this.prismaService.category.create({ data: dto });

      return {
        message: t('common.success.create_category'),
        data: new CategoryResponseDto(category),
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(t('common.errors.category_name_exists'));
      }
      throw error;
    }
  }

  async updateCategory(id: number, dto: CreateCategoryDto) {
    await this.findCategoryOrThrow(id);

    try {
      const category = await this.prismaService.category.update({
        where: { id },
        data: dto,
      });

      return {
        message: t('common.success.update_category'),
        data: new CategoryResponseDto(category),
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(t('common.errors.category_name_exists'));
      }
      throw error;
    }
  }

  async deleteCategory(id: number) {
    await this.findCategoryOrThrow(id);

    await this.prismaService.category.delete({ where: { id } });

    return { message: t('common.success.delete_category') };
  }

  private async findCategoryOrThrow(id: number) {
    const category = await this.prismaService.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException(t('common.errors.category_not_found'));
    }

    return category;
  }
}
