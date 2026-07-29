import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { FileService } from '@/file/file.service';

import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService, FileService],
})
export class ProfileModule {}
