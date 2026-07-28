import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import * as path from 'path';

import { MailProcessor } from './processor';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.getOrThrow('MAIL_HOST'),
          port: config.getOrThrow('MAIL_PORT'),
          secure: false,
          auth: {
            user: config.getOrThrow('MAIL_USER'),
            pass: config.getOrThrow('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: config.getOrThrow('MAIL_FROM'),
        },
        template: {
          dir: path.join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
        options: {
          partials: { dir: path.join(__dirname, 'templates', 'partials') },
        },
      }),
    }),

    BullModule.registerQueue({
      name: 'mail-queue',
    }),
  ],
  providers: [MailProcessor],
  exports: [BullModule],
})
export class MailModule {}
