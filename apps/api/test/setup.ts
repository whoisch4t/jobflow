import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma';

beforeEach(async () => {
  // Users cascade to everything else.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});
