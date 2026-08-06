import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Role } from '@prisma/client';
import type { Queue } from 'bull';
import { subMonths } from 'date-fns';

import { PrismaService } from '@/prisma/prisma.service';
import { currentLang } from '@/utils/i18n.util';

import { AnalyticsService } from './analytics.service';

@Injectable()
export class MonthlyReportScheduler {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prismaService: PrismaService,
    @InjectQueue('mail-queue') private readonly mailQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT, {
    name: 'monthly-report',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async sendMonthlyReport() {
    const lastMonth = subMonths(new Date(), 1);
    const month = lastMonth.getMonth() + 1;
    const year = lastMonth.getFullYear();
    const dashboard = await this.analyticsService.getDashboard(month, year);

    const admins = await this.prismaService.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
      select: { email: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.mailQueue.add(
          'send-monthly-report-email',
          {
            email: admin.email,
            month,
            year,
            totalOrders: dashboard.totalOrders,
            totalRevenue: dashboard.totalRevenue,
            topProducts: dashboard.topProducts,
            lang: currentLang(),
          },
          { attempts: 3, backoff: 5000, removeOnComplete: true },
        ),
      ),
    );
  }
}
