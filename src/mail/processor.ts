import { Process, Processor } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import type { Job } from 'bull';
import { I18nService } from 'nestjs-i18n';

interface MailJobData {
  email: string;
  url: string;
  lang?: string;
}

interface TopProduct {
  productName: string;
  totalSold: number;
}

interface MonthlyReportMailJobData {
  email: string;
  month: number;
  year: number;
  totalOrders: number;
  totalRevenue: number;
  topProducts: TopProduct[];
  lang?: string;
}

@Processor('mail-queue')
export class MailProcessor {
  constructor(
    private readonly mailerService: MailerService,
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
  ) {}

  private get appName(): string {
    return this.configService.get('APP_NAME', 'Mock Ecommerce');
  }

  private buildFooterContext(lang?: string) {
    return {
      footerText: this.i18n.t('mail.footer', { lang }),
      copyrightText: this.i18n.t('mail.footer_copyright', {
        lang,
        args: { year: new Date().getFullYear(), appName: this.appName },
      }),
    };
  }

  @Process('send-activation-email')
  async handleSendActivationEmail(job: Job<MailJobData>) {
    const { email, url, lang } = job.data;
    const args = { appName: this.appName };

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: this.i18n.t('mail.activation.subject', { lang, args }),
        template: './activation',
        context: {
          lang,
          appName: this.appName,
          heading: this.i18n.t('mail.activation.heading', { lang }),
          greeting: this.i18n.t('mail.greeting', { lang }),
          body: this.i18n.t('mail.activation.body', { lang, args }),
          button: this.i18n.t('mail.activation.button', { lang }),
          expiry: this.i18n.t('mail.activation.expiry', { lang }),
          url,
          ...this.buildFooterContext(lang),
        },
      });
      console.log(`[Queue] Gửi mail kích hoạt thành công tới: ${email}`);
    } catch (error) {
      console.error(`[Queue] Lỗi khi gửi mail tới ${email}:`, error);
      throw error;
    }
  }

  @Process('send-reset-password-email')
  async handleSendResetPasswordEmail(job: Job<MailJobData>) {
    const { email, url, lang } = job.data;
    const args = { appName: this.appName };

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: this.i18n.t('mail.reset_password.subject', { lang }),
        template: './reset-password',
        context: {
          lang,
          appName: this.appName,
          heading: this.i18n.t('mail.reset_password.heading', { lang }),
          greeting: this.i18n.t('mail.greeting', { lang }),
          body: this.i18n.t('mail.reset_password.body', { lang, args }),
          button: this.i18n.t('mail.reset_password.button', { lang }),
          expiry: this.i18n.t('mail.reset_password.expiry', { lang }),
          url,
          ...this.buildFooterContext(lang),
        },
      });
      console.log(`[Queue] Đã gửi mail reset password tới: ${email}`);
    } catch (error) {
      console.error(`[Queue] Lỗi gửi mail reset password:`, error);
      throw error;
    }
  }

  @Process('send-monthly-report-email')
  async handleSendMonthlyReportEmail(job: Job<MonthlyReportMailJobData>) {
    const { email, month, year, totalOrders, totalRevenue, topProducts, lang } = job.data;
    const args = { appName: this.appName, month, year };

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: this.i18n.t('mail.monthly_report.subject', { lang, args }),
        template: './monthly-report',
        context: {
          lang,
          appName: this.appName,
          heading: this.i18n.t('mail.monthly_report.heading', { lang, args }),
          greeting: this.i18n.t('mail.greeting', { lang }),
          body: this.i18n.t('mail.monthly_report.body', { lang, args }),
          totalOrdersLabel: this.i18n.t('mail.monthly_report.total_orders', { lang }),
          totalRevenueLabel: this.i18n.t('mail.monthly_report.total_revenue', { lang }),
          topProductsLabel: this.i18n.t('mail.monthly_report.top_products', { lang }),
          totalOrders,
          totalRevenue: totalRevenue.toLocaleString('vi-VN'),
          topProducts,
          ...this.buildFooterContext(lang),
        },
      });
      console.log(`[Queue] Đã gửi mail báo cáo tháng ${month}/${year} tới: ${email}`);
    } catch (error) {
      console.error(`[Queue] Lỗi gửi mail báo cáo tháng:`, error);
      throw error;
    }
  }
}
