import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '@/auth/auth.service';
import { RedisService } from '@/redis/redis.service';
import { t } from '@/utils/i18n.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('SECRET_KEY'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { sub: number; exp: number }) {
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!rawToken) {
      throw new UnauthorizedException(t('common.errors.unauthorized'));
    }

    const isBlacklisted = await this.redisService.get(`blacklist:${rawToken}`);
    if (isBlacklisted) {
      throw new UnauthorizedException(t('common.errors.unauthorized'));
    }

    try {
      const user = await this.authService.findById(payload.sub);
      return { ...user, token: rawToken, exp: payload.exp };
    } catch {
      throw new UnauthorizedException(t('common.errors.unauthorized'));
    }
  }
}
