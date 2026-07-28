import type { User } from '@prisma/client';

export type SafeUser = Omit<User, 'password'>;

export interface AuthenticatedUser extends SafeUser {
  token: string;
  exp: number;
}
