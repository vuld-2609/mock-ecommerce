import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { Queue } from 'bull';
import * as crypto from 'crypto';

import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { currentLang, t } from '@/utils/i18n.util';

import { RegisterDto } from './dto/register-dto';
import { SafeUser } from './types/authenticated-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    @InjectQueue('mail-queue') private readonly mailQueue: Queue,
  ) {}

  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private async getTokens(userId: number, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ sub: userId, email, jti: crypto.randomUUID() }),
      this.jwtService.signAsync(
        { sub: userId, email, jti: crypto.randomUUID() },
        {
          secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async register(registerDto: RegisterDto) {
    try {
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = this.hashValue(rawToken);
      const activationUrl = `${this.configService.getOrThrow('APP_URL')}/auth/activate?token=${rawToken}`;

      const user = await this.prismaService.user.create({
        data: {
          ...registerDto,
          password: hashedPassword,
          verifyToken: hashedToken,
          verifyTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
          role: Role.USER,
        },
      });

      await this.mailQueue.add(
        'send-activation-email',
        {
          email: user.email,
          url: activationUrl,
          lang: currentLang(),
        },
        {
          attempts: 3,
          backoff: 5000,
          removeOnComplete: true,
        },
      );

      return { message: t('common.success.register') };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(t('common.errors.email_already_exists'));
      }
      throw new InternalServerErrorException(t('common.errors.registration_failed'));
    }
  }

  async activateAccount(token: string) {
    const hashedToken = this.hashValue(token);
    const user = await this.prismaService.user.findUnique({
      where: { verifyToken: hashedToken },
    });

    if (!user) {
      throw new BadRequestException(t('common.errors.invalid_token'));
    }

    if (!user.verifyTokenExpires || user.verifyTokenExpires < new Date()) {
      throw new BadRequestException(t('common.errors.token_expired'));
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        verifyToken: null,
        verifyTokenExpires: null,
      },
    });

    return { message: t('common.success.activate') };
  }

  async validateUser(email: string, password: string): Promise<SafeUser | null> {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    if (!user.isActive) {
      throw new BadRequestException(t('common.errors.account_not_activated'));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = user;
    return result;
  }

  async findById(id: number): Promise<SafeUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      omit: { password: true },
    });
    if (!user) {
      throw new NotFoundException(t('common.errors.user_not_found'));
    }

    return user;
  }

  async login(user: SafeUser) {
    const tokens = await this.getTokens(user.id, user.email);

    await this.prismaService.refreshToken.create({
      data: {
        token: this.hashValue(tokens.refreshToken),
        userId: user.id,
      },
    });

    return { message: t('common.success.login'), data: tokens };
  }

  async refreshTokens(refreshToken: string) {
    let payload: { sub: number; email: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(t('common.errors.invalid_refresh_token'));
    }

    const hashedToken = this.hashValue(refreshToken);
    const stored = await this.prismaService.refreshToken.findUnique({
      where: { token: hashedToken },
    });

    if (!stored || stored.userId !== payload.sub) {
      throw new UnauthorizedException(t('common.errors.invalid_refresh_token'));
    }

    await this.prismaService.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.getTokens(payload.sub, payload.email);
    await this.prismaService.refreshToken.create({
      data: {
        token: this.hashValue(tokens.refreshToken),
        userId: payload.sub,
      },
    });

    return { message: t('common.success.token_refreshed'), data: tokens };
  }

  async logout(userId: number, refreshToken: string, accessToken: string, accessTokenExp: number) {
    await this.prismaService.refreshToken.deleteMany({
      where: { userId, token: this.hashValue(refreshToken) },
    });

    const ttlSeconds = accessTokenExp - Math.floor(Date.now() / 1000);
    if (ttlSeconds > 0) {
      await this.redisService.set(`blacklist:${accessToken}`, '1', ttlSeconds);
    }

    return { message: t('common.success.logout') };
  }

  async forgotPassword(email: string) {
    const genericResponse = { message: t('common.success.forgot_password_generic') };

    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) {
      return genericResponse;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashValue(rawToken);
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expires,
      },
    });

    const resetUrl = `${this.configService.getOrThrow('APP_URL')}/auth/reset-password?token=${rawToken}`;

    await this.mailQueue.add(
      'send-reset-password-email',
      {
        email: user.email,
        url: resetUrl,
        lang: currentLang(),
      },
      {
        attempts: 3,
        backoff: 5000,
        removeOnComplete: true,
      },
    );

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = this.hashValue(token);
    const user = await this.prismaService.user.findUnique({
      where: { resetPasswordToken: hashedToken },
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException(t('common.errors.invalid_reset_token'));
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: { id: user.id },
        data: {
          password: newHashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      }),
      this.prismaService.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    return { message: t('common.success.reset_password') };
  }
}
