import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { SafeUser } from '@/auth/types/authenticated-user.type';

export class ProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ nullable: true })
  avatar: string | null;

  @ApiProperty({ default: Role.USER })
  role: Role;

  @ApiProperty()
  createdAt: Date;

  constructor(profile: SafeUser & { avatar: string | null }) {
    this.id = profile.id;
    this.avatar = profile.avatar;
    this.email = profile.email;
    this.fullName = profile.fullName;
    this.role = profile.role;
    this.createdAt = profile.createdAt;
  }
}
