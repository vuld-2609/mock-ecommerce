import { Prisma } from '@prisma/client';

const UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_ERROR_CODE
  );
}
