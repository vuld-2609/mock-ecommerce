import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
            refreshToken: {
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn(), get: jest.fn() } },
        { provide: JwtService, useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() } },
        { provide: RedisService, useValue: { get: jest.fn(), set: jest.fn() } },
        { provide: getQueueToken('mail-queue'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
