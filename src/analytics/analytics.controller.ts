import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { RolesGuard } from '@/guards/roles.guard';

import { AnalyticsService } from './analytics.service';
import { GetDashboardQueryDto } from './dto/get-dashboard-query-dto';
import { MonthlyReportScheduler } from './monthly-report.scheduler';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly monthReport: MonthlyReportScheduler,
  ) {}

  @Get('dashboard')
  getDashboard(@Query() query: GetDashboardQueryDto) {
    return this.analyticsService.getDashboard(query.month, query.year);
  }

  @Post()
  sendAnalyics() {
    return this.monthReport.sendMonthlyReport();
  }
}
