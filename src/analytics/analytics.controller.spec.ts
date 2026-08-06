import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '@/prisma/prisma.service';
import { ProductsService } from '@/products/products.service';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { MonthlyReportScheduler } from './monthly-report.scheduler';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: {} },
        { provide: ProductsService, useValue: {} },
        { provide: MonthlyReportScheduler, useValue: {} },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
