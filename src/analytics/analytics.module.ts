import { Module } from '@nestjs/common';

import { MailModule } from '@/mail/mail.module';
import { ProductsModule } from '@/products/products.module';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { MonthlyReportScheduler } from './monthly-report.scheduler';

@Module({
  imports: [ProductsModule, MailModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, MonthlyReportScheduler],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
