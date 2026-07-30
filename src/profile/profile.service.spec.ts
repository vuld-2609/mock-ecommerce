import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from '@/auth/auth.service';
import { FileService } from '@/file/file.service';
import { PrismaService } from '@/prisma/prisma.service';

import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: FileService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
