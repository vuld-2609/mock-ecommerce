import { Prisma } from '@prisma/client';

const UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';
const FOREIGN_KEY_CONSTRAINT_ERROR_CODE = 'P2003';

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_ERROR_CODE
  );
}

export function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === FOREIGN_KEY_CONSTRAINT_ERROR_CODE
  );
}
