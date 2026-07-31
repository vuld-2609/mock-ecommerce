import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';
import { t } from '@/utils/i18n.util';

import { CategoryResponseDto } from './dto/category-response-dto';
import { CreateCategoryDto } from './dto/create-category-dto';

const PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';

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
      this.assertNotDuplicateNameError(error);
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
      this.assertNotDuplicateNameError(error);
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

  private assertNotDuplicateNameError(error: unknown): void {
    const isDuplicateNameError =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE;

    if (isDuplicateNameError) {
      throw new ConflictException(t('common.errors.category_name_exists'));
    }
  }
}
