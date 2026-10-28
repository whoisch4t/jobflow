import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { computeOverview, weekStart } from '../src/modules/analytics';
import { signedInAgent } from './helpers';

const DAY = 86_400_000;

describe('weekStart', () => {
  it('returns Monday 00:00 UTC', () => {
    expect(weekStart(new Date('2026-10-22T15:30:00Z')).toISOString()).toBe('2026-10-19T00:00:00.000Z'); // Thursday
    expect(weekStart(new Date('2026-10-19T00:00:00Z')).toISOString()).toBe('2026-10-19T00:00:00.000Z'); // Monday
    expect(weekStart(new Date('2026-10-25T23:59:00Z')).toISOString()).toBe('2026-10-19T00:00:00.000Z'); // Sunday
  });
});

describe('analytics overview', () => {
  it('counts statuses, funnel stages and rates', async () => {
    const { agent, user } = await signedInAgent();
    const make = async (status: string, source?: string) =>
      (
        await agent
          .post('/api/applications')
          .send({ title: `Role ${status}`, companyName: `Co ${status}`, status, source })
      ).body.application.id as string;

    await make('WISHLIST');
    await make('APPLIED', 'LinkedIn');
    const screened = await make('APPLIED', 'LinkedIn');
    await agent.patch(`/api/applications/${screened}/status`).send({ status: 'SCREENING' });
    await agent.patch(`/api/applications/${screened}/status`).send({ status: 'REJECTED' });
    const interviewing = await make('APPLIED', 'Referral');
    await agent
      .post(`/api/applications/${interviewing}/interviews`)
      .send({ type: 'PHONE', scheduledAt: new Date(Date.now() + DAY) });
    await agent.put(`/api/applications/${interviewing}/offer`).send({ salary: 1000, currency: 'EUR' });

    const overview = await computeOverview(user.id);

    expect(overview.totals).toMatchObject({
      applications: 4,
      applied: 3,
      interviews: 1,
      upcomingInterviews: 1,
      offers: 1,
    });
    expect(overview.byStatus).toMatchObject({ WISHLIST: 1, APPLIED: 1, REJECTED: 1, OFFER: 1 });
    // The rejected one passed screening, so it still counts for that stage.
    expect(overview.funnel).toEqual([
      { stage: 'APPLIED', count: 3 },
      { stage: 'SCREENING', count: 2 },
      { stage: 'INTERVIEWING', count: 1 },
      { stage: 'OFFER', count: 1 },
      { stage: 'ACCEPTED', count: 0 },
    ]);
    expect(overview.rates.response).toBeCloseTo(2 / 3, 2);
    expect(overview.rates.offer).toBeCloseTo(1 / 3, 2);
    expect(overview.bySource).toEqual([
      { source: 'LinkedIn', count: 2 },
      { source: 'Referral', count: 1 },
    ]);
    expect(overview.weekly).toHaveLength(12);
    expect(overview.weekly.at(-1)!.count).toBe(3);
  });

  it('measures days until the first reply', async () => {
    const { agent, user } = await signedInAgent();
    const id = (await agent.post('/api/applications').send({ title: 'R', companyName: 'C', status: 'APPLIED' })).body
      .application.id as string;
    const appliedAt = new Date(Date.now() - 10 * DAY);
    await prisma.application.update({ where: { id }, data: { appliedAt } });
    await prisma.statusChange.create({
      data: {
        applicationId: id,
        fromStatus: 'APPLIED',
        toStatus: 'SCREENING',
        changedAt: new Date(appliedAt.getTime() + 4 * DAY),
      },
    });

    const overview = await computeOverview(user.id);
    expect(overview.avgDaysToFirstResponse).toBe(4);
  });

  it('is served over HTTP and recomputed after writes', async () => {
    const { agent } = await signedInAgent();
    expect((await agent.get('/api/analytics/overview')).body.totals.applications).toBe(0);
    await agent.post('/api/applications').send({ title: 'R', companyName: 'C' });
    expect((await agent.get('/api/analytics/overview')).body.totals.applications).toBe(1);
  });

  it('lists notifications for interviews coming up soon', async () => {
    const { agent } = await signedInAgent();
    const id = (await agent.post('/api/applications').send({ title: 'Soon', companyName: 'C', status: 'APPLIED' })).body
      .application.id as string;
    await agent
      .post(`/api/applications/${id}/interviews`)
      .send({ type: 'PHONE', scheduledAt: new Date(Date.now() + 3_600_000) });
    await agent
      .post(`/api/applications/${id}/interviews`)
      .send({ type: 'PHONE', scheduledAt: new Date(Date.now() + 10 * DAY) });

    const res = await agent.get('/api/notifications');
    expect(res.body.items).toEqual([
      expect.objectContaining({ kind: 'INTERVIEW_SOON', applicationId: id, title: 'Soon' }),
    ]);
  });
});
