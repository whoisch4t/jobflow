import type { ApplicationListQuery, ApplicationStatus } from '@jobflow/shared';
import { type Prisma, prisma } from '../lib/prisma';
import { badRequest, notFound } from '../lib/errors';
import { invalidateUserAnalytics } from '../lib/cache';

type Tx = Prisma.TransactionClient;

export const summarySelect = {
  id: true,
  title: true,
  status: true,
  location: true,
  workMode: true,
  source: true,
  salaryMin: true,
  salaryMax: true,
  currency: true,
  jobUrl: true,
  appliedAt: true,
  createdAt: true,
  updatedAt: true,
  company: { select: { id: true, name: true } },
  cvVersion: { select: { id: true, name: true } },
  _count: { select: { interviews: true, notes: true } },
} satisfies Prisma.ApplicationSelect;

/** Throws 404 unless the application exists and belongs to the user. */
export async function assertOwnApplication(userId: string, applicationId: string, tx: Tx = prisma) {
  const app = await tx.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true, status: true, appliedAt: true, salaryMin: true, salaryMax: true },
  });
  if (!app) throw notFound('Application');
  return app;
}

export async function assertOwnCvVersion(userId: string, cvVersionId: string | null | undefined, tx: Tx = prisma) {
  if (!cvVersionId) return;
  const cv = await tx.cvVersion.findFirst({ where: { id: cvVersionId, userId }, select: { id: true } });
  if (!cv) throw badRequest('Validation failed', [{ path: 'cvVersionId', message: 'CV version not found' }]);
}

export async function assertOwnCompany(userId: string, companyId: string, tx: Tx = prisma) {
  const company = await tx.company.findFirst({ where: { id: companyId, userId }, select: { id: true } });
  if (!company) throw badRequest('Validation failed', [{ path: 'companyId', message: 'Company not found' }]);
}

/** Uses an existing company with this name (case-insensitive) or creates it. */
export async function findOrCreateCompany(userId: string, name: string, tx: Tx = prisma) {
  const existing = await tx.company.findFirst({
    where: { userId, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await tx.company.create({ data: { userId, name }, select: { id: true } });
  return created.id;
}

/** Statuses after APPLIED imply the application was sent, so fill in appliedAt if it is missing. */
const SUBMITTED: readonly ApplicationStatus[] = [
  'APPLIED',
  'SCREENING',
  'INTERVIEWING',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
];

export function appliedAtFor(status: ApplicationStatus, current: Date | null | undefined) {
  return current ?? (SUBMITTED.includes(status) ? new Date() : null);
}

/**
 * Moves an application to `to` and records the change. Does nothing if the status is the same.
 * Pass `onlyFrom` to move only when the current status is one of them (used for automatic moves).
 */
export async function changeStatus(
  tx: Tx,
  app: { id: string; status: ApplicationStatus; appliedAt: Date | null },
  to: ApplicationStatus,
  onlyFrom?: readonly ApplicationStatus[],
) {
  if (app.status === to) return false;
  if (onlyFrom && !onlyFrom.includes(app.status)) return false;
  await tx.application.update({
    where: { id: app.id },
    data: { status: to, appliedAt: appliedAtFor(to, app.appliedAt) },
  });
  await tx.statusChange.create({ data: { applicationId: app.id, fromStatus: app.status, toStatus: to } });
  return true;
}

const ORDER_BY: Record<
  ApplicationListQuery['sort'],
  (o: Prisma.SortOrder) => Prisma.ApplicationOrderByWithRelationInput
> = {
  updated: (o) => ({ updatedAt: o }),
  created: (o) => ({ createdAt: o }),
  applied: (o) => ({ appliedAt: { sort: o, nulls: 'last' } }),
  company: (o) => ({ company: { name: o } }),
  title: (o) => ({ title: o }),
};

export async function listApplications(userId: string, query: ApplicationListQuery) {
  const where: Prisma.ApplicationWhereInput = {
    userId,
    ...(query.status?.length && { status: { in: query.status } }),
    ...(query.workMode && { workMode: query.workMode }),
    ...(query.companyId && { companyId: query.companyId }),
    ...(query.q && {
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { company: { name: { contains: query.q, mode: 'insensitive' } } },
        { location: { contains: query.q, mode: 'insensitive' } },
        { source: { contains: query.q, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      select: summarySelect,
      orderBy: [ORDER_BY[query.sort](query.order), { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getApplicationDetail(userId: string, id: string) {
  const app = await prisma.application.findFirst({
    where: { id, userId },
    select: {
      ...summarySelect,
      description: true,
      company: true,
      interviews: { orderBy: { scheduledAt: 'asc' } },
      offer: true,
      notes: { orderBy: { createdAt: 'desc' } },
      statusHistory: { orderBy: { changedAt: 'asc' } },
    },
  });
  if (!app) throw notFound('Application');
  return app;
}

export function touched(userId: string) {
  invalidateUserAnalytics(userId);
}
