import { Router } from 'express';
import {
  APPLICATION_STATUSES,
  RESPONDED_STATUSES,
  type AnalyticsOverview,
  type AppNotification,
  type ApplicationStatus,
} from '@jobflow/shared';
import { prisma } from '../lib/prisma';
import { analyticsCacheKey, cached } from '../lib/cache';
import { currentUserId } from '../middleware/auth';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 12;

/** How far along the pipeline a status is. Rejected/withdrawn say nothing about progress. */
const STAGE_RANK: Partial<Record<ApplicationStatus, number>> = {
  APPLIED: 1,
  SCREENING: 2,
  INTERVIEWING: 3,
  OFFER: 4,
  ACCEPTED: 5,
};
const FUNNEL: ApplicationStatus[] = ['APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'ACCEPTED'];

/** Monday 00:00 UTC of the week containing `date`. */
export function weekStart(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

const ratio = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 1000) / 1000);

export async function computeOverview(userId: string, now = new Date()): Promise<AnalyticsOverview> {
  const [apps, upcomingInterviews, interviews] = await Promise.all([
    prisma.application.findMany({
      where: { userId },
      select: {
        status: true,
        source: true,
        appliedAt: true,
        offer: { select: { id: true } },
        _count: { select: { interviews: true } },
        statusHistory: { select: { toStatus: true, changedAt: true }, orderBy: { changedAt: 'asc' } },
      },
    }),
    prisma.interview.count({ where: { application: { userId }, scheduledAt: { gte: now } } }),
    prisma.interview.count({ where: { application: { userId } } }),
  ]);

  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
  const reached = Object.fromEntries(FUNNEL.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
  const sources = new Map<string, number>();
  const firstWeek = weekStart(new Date(now.getTime() - (WEEKS - 1) * 7 * DAY_MS));
  const weekly = Array.from({ length: WEEKS }, (_, i) => ({
    weekStart: new Date(firstWeek.getTime() + i * 7 * DAY_MS).toISOString(),
    count: 0,
  }));

  let submitted = 0;
  let responded = 0;
  let offers = 0;
  const responseDays: number[] = [];

  for (const app of apps) {
    byStatus[app.status] += 1;
    if (app.offer) offers += 1;
    if (!app.appliedAt) continue;

    submitted += 1;
    const source = app.source?.trim() || 'Other';
    sources.set(source, (sources.get(source) ?? 0) + 1);

    const weekIndex = Math.floor((weekStart(app.appliedAt).getTime() - firstWeek.getTime()) / (7 * DAY_MS));
    if (weekIndex >= 0 && weekIndex < WEEKS) weekly[weekIndex]!.count += 1;

    // Furthest stage reached, from the history plus what we know for sure.
    let rank = 1;
    for (const change of app.statusHistory) rank = Math.max(rank, STAGE_RANK[change.toStatus] ?? 0);
    rank = Math.max(rank, STAGE_RANK[app.status] ?? 0);
    if (app._count.interviews > 0) rank = Math.max(rank, 3);
    if (app.offer) rank = Math.max(rank, 4);
    for (const stage of FUNNEL) if ((STAGE_RANK[stage] ?? 0) <= rank) reached[stage] += 1;

    const firstReply = app.statusHistory.find(
      (c) => RESPONDED_STATUSES.includes(c.toStatus) && c.changedAt >= app.appliedAt!,
    );
    if (firstReply || RESPONDED_STATUSES.includes(app.status)) responded += 1;
    if (firstReply) responseDays.push((firstReply.changedAt.getTime() - app.appliedAt.getTime()) / DAY_MS);
  }

  const active = byStatus.APPLIED + byStatus.SCREENING + byStatus.INTERVIEWING + byStatus.OFFER;

  return {
    totals: { applications: apps.length, active, applied: submitted, interviews, upcomingInterviews, offers },
    rates: {
      response: ratio(responded, submitted),
      interview: ratio(reached.INTERVIEWING, submitted),
      offer: ratio(reached.OFFER, submitted),
    },
    byStatus,
    funnel: FUNNEL.map((stage) => ({ stage, count: reached[stage] })),
    weekly,
    bySource: [...sources.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source))
      .slice(0, 8),
    avgDaysToFirstResponse: responseDays.length
      ? Math.round((responseDays.reduce((a, b) => a + b, 0) / responseDays.length) * 10) / 10
      : null,
  };
}

export async function computeNotifications(userId: string, now = new Date()): Promise<AppNotification[]> {
  const in48h = new Date(now.getTime() + 2 * DAY_MS);
  const in7d = new Date(now.getTime() + 7 * DAY_MS);
  const ago14d = new Date(now.getTime() - 14 * DAY_MS);
  const ago7d = new Date(now.getTime() - 7 * DAY_MS);
  const appSelect = { id: true, title: true, company: { select: { name: true } } } as const;

  const [interviews, offers, stale] = await Promise.all([
    prisma.interview.findMany({
      where: { application: { userId }, outcome: 'PENDING', scheduledAt: { gte: now, lte: in48h } },
      orderBy: { scheduledAt: 'asc' },
      include: { application: { select: appSelect } },
    }),
    prisma.offer.findMany({
      where: { application: { userId }, decision: 'PENDING', deadline: { gte: now, lte: in7d } },
      orderBy: { deadline: 'asc' },
      include: { application: { select: appSelect } },
    }),
    prisma.application.findMany({
      where: { userId, status: 'APPLIED', appliedAt: { lte: ago14d }, updatedAt: { lte: ago7d } },
      orderBy: { appliedAt: 'asc' },
      take: 5,
      select: { ...appSelect, appliedAt: true },
    }),
  ]);

  return [
    ...interviews.map((i) => ({
      id: `interview:${i.id}`,
      kind: 'INTERVIEW_SOON' as const,
      applicationId: i.application.id,
      title: i.application.title,
      company: i.application.company.name,
      date: i.scheduledAt.toISOString(),
    })),
    ...offers.map((o) => ({
      id: `offer:${o.id}`,
      kind: 'OFFER_DEADLINE' as const,
      applicationId: o.application.id,
      title: o.application.title,
      company: o.application.company.name,
      date: o.deadline!.toISOString(),
    })),
    ...stale.map((a) => ({
      id: `follow-up:${a.id}`,
      kind: 'FOLLOW_UP' as const,
      applicationId: a.id,
      title: a.title,
      company: a.company.name,
      date: a.appliedAt!.toISOString(),
    })),
  ];
}

export const analyticsRouter = Router();

analyticsRouter.get('/overview', async (req, res) => {
  const userId = currentUserId(req);
  res.json(await cached(analyticsCacheKey(userId), 60, () => computeOverview(userId)));
});

export const notificationsRouter = Router();

notificationsRouter.get('/', async (req, res) => {
  res.json({ items: await computeNotifications(currentUserId(req)) });
});
