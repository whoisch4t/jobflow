import { describe, expect, it } from 'vitest';
import { signedInAgent } from './helpers';

type Agent = Awaited<ReturnType<typeof signedInAgent>>['agent'];

async function createApp(agent: Agent, body: Record<string, unknown>) {
  const res = await agent.post('/api/applications').send(body);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.application as { id: string; status: string; company: { id: string; name: string } };
}

describe('applications', () => {
  it('creates an application with a new company and reuses it by name', async () => {
    const { agent } = await signedInAgent();
    const first = await createApp(agent, { title: 'Frontend Developer', companyName: 'Acme', status: 'APPLIED' });
    const second = await createApp(agent, { title: 'Backend Developer', companyName: 'acme' });

    expect(second.company.id).toBe(first.company.id);
    const companies = await agent.get('/api/companies');
    expect(companies.body.items).toHaveLength(1);
    expect(companies.body.items[0]._count.applications).toBe(2);
  });

  it('fills appliedAt for submitted applications and records the first status', async () => {
    const { agent } = await signedInAgent();
    const wish = await createApp(agent, { title: 'Wishlist role', companyName: 'A' });
    const applied = await createApp(agent, { title: 'Applied role', companyName: 'B', status: 'APPLIED' });

    const wishDetail = (await agent.get(`/api/applications/${wish.id}`)).body.application;
    const appliedDetail = (await agent.get(`/api/applications/${applied.id}`)).body.application;
    expect(wishDetail.appliedAt).toBeNull();
    expect(appliedDetail.appliedAt).not.toBeNull();
    expect(appliedDetail.statusHistory).toEqual([expect.objectContaining({ fromStatus: null, toStatus: 'APPLIED' })]);
  });

  it('validates input', async () => {
    const { agent } = await signedInAgent();
    const res = await agent
      .post('/api/applications')
      .send({ title: '', jobUrl: 'not a url', salaryMin: 100, salaryMax: 50 });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['title', 'jobUrl']));
  });

  it('checks the salary range against stored values on partial updates', async () => {
    const { agent } = await signedInAgent();
    const app = await createApp(agent, { title: 'Dev', companyName: 'A', salaryMin: 1000, salaryMax: 2000 });

    const tooHigh = await agent.patch(`/api/applications/${app.id}`).send({ salaryMin: 3000 });
    expect(tooHigh.status).toBe(400);
    const tooLow = await agent.patch(`/api/applications/${app.id}`).send({ salaryMax: 500 });
    expect(tooLow.status).toBe(400);

    const cleared = await agent.patch(`/api/applications/${app.id}`).send({ salaryMax: '', salaryMin: 3000 });
    expect(cleared.status).toBe(200);
    expect(cleared.body.application.salaryMin).toBe(3000);
  });

  it('searches, filters, sorts and paginates', async () => {
    const { agent } = await signedInAgent();
    await createApp(agent, { title: 'React Developer', companyName: 'Zeta', status: 'APPLIED', workMode: 'REMOTE' });
    await createApp(agent, {
      title: 'Node Developer',
      companyName: 'Alpha',
      status: 'INTERVIEWING',
      workMode: 'ONSITE',
    });
    await createApp(agent, { title: 'Data Engineer', companyName: 'Beta React Labs', status: 'REJECTED' });

    const search = await agent.get('/api/applications').query({ q: 'react' });
    expect(search.body.total).toBe(2); // title match + company name match

    const byStatus = await agent.get('/api/applications').query({ status: 'APPLIED,INTERVIEWING' });
    expect(byStatus.body.items.map((a: { title: string }) => a.title).sort()).toEqual([
      'Node Developer',
      'React Developer',
    ]);

    const remote = await agent.get('/api/applications').query({ workMode: 'REMOTE' });
    expect(remote.body.total).toBe(1);

    const sorted = await agent.get('/api/applications').query({ sort: 'company', order: 'asc' });
    expect(sorted.body.items.map((a: { company: { name: string } }) => a.company.name)).toEqual([
      'Alpha',
      'Beta React Labs',
      'Zeta',
    ]);

    const page2 = await agent.get('/api/applications').query({ pageSize: 2, page: 2, sort: 'title', order: 'asc' });
    expect(page2.body).toMatchObject({ total: 3, page: 2, totalPages: 2 });
    expect(page2.body.items).toHaveLength(1);
  });

  it('records every status change in the history', async () => {
    const { agent } = await signedInAgent();
    const app = await createApp(agent, { title: 'Role', companyName: 'C', status: 'APPLIED' });

    await agent.patch(`/api/applications/${app.id}/status`).send({ status: 'SCREENING' }).expect(200);
    await agent.patch(`/api/applications/${app.id}/status`).send({ status: 'SCREENING' }).expect(200); // no-op
    await agent.patch(`/api/applications/${app.id}`).send({ status: 'REJECTED', location: 'Remote' }).expect(200);

    const detail = (await agent.get(`/api/applications/${app.id}`)).body.application;
    expect(detail.location).toBe('Remote');
    expect(detail.statusHistory.map((s: { toStatus: string }) => s.toStatus)).toEqual([
      'APPLIED',
      'SCREENING',
      'REJECTED',
    ]);
  });

  it('moves the application forward when an interview or offer is added', async () => {
    const { agent } = await signedInAgent();
    const app = await createApp(agent, { title: 'Role', companyName: 'D', status: 'APPLIED' });

    const interview = await agent
      .post(`/api/applications/${app.id}/interviews`)
      .send({ type: 'TECHNICAL', scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), durationMinutes: 60 });
    expect(interview.status).toBe(201);
    expect((await agent.get(`/api/applications/${app.id}`)).body.application.status).toBe('INTERVIEWING');

    const offer = await agent.put(`/api/applications/${app.id}/offer`).send({ salary: 50000, currency: 'eur' });
    expect(offer.status).toBe(200);
    expect(offer.body.offer.currency).toBe('EUR');
    expect((await agent.get(`/api/applications/${app.id}`)).body.application.status).toBe('OFFER');

    await agent
      .put(`/api/applications/${app.id}/offer`)
      .send({ salary: 52000, currency: 'EUR', decision: 'ACCEPTED' })
      .expect(200);
    const detail = (await agent.get(`/api/applications/${app.id}`)).body.application;
    expect(detail.status).toBe('ACCEPTED');
    expect(detail.offer.salary).toBe(52000);
  });

  it('does not move a rejected application when an offer is recorded later', async () => {
    const { agent } = await signedInAgent();
    const app = await createApp(agent, { title: 'Role', companyName: 'E', status: 'REJECTED' });
    await agent
      .put(`/api/applications/${app.id}/offer`)
      .send({ salary: 1, currency: 'USD', decision: 'ACCEPTED' })
      .expect(200);
    expect((await agent.get(`/api/applications/${app.id}`)).body.application.status).toBe('REJECTED');
  });

  it('manages notes and interviews', async () => {
    const { agent } = await signedInAgent();
    const app = await createApp(agent, { title: 'Role', companyName: 'F' });

    const note = (await agent.post(`/api/applications/${app.id}/notes`).send({ content: 'First note' })).body.note;
    await agent.patch(`/api/notes/${note.id}`).send({ content: 'Edited' }).expect(200);
    const interview = (
      await agent
        .post(`/api/applications/${app.id}/interviews`)
        .send({ type: 'PHONE', scheduledAt: '2030-01-01T10:00:00Z' })
    ).body.interview;
    await agent.patch(`/api/interviews/${interview.id}`).send({ outcome: 'PASSED' }).expect(200);

    const upcoming = await agent.get('/api/interviews').query({ range: 'upcoming' });
    expect(upcoming.body.items[0]).toMatchObject({
      id: interview.id,
      outcome: 'PASSED',
      application: { title: 'Role' },
    });

    const detail = (await agent.get(`/api/applications/${app.id}`)).body.application;
    expect(detail.notes[0].content).toBe('Edited');

    await agent.delete(`/api/notes/${note.id}`).expect(204);
    await agent.delete(`/api/interviews/${interview.id}`).expect(204);
    await agent.delete(`/api/applications/${app.id}`).expect(204);
    await agent.get(`/api/applications/${app.id}`).expect(404);
  });

  it("never exposes or changes another user's data", async () => {
    const alice = await signedInAgent('Alice');
    const bob = await signedInAgent('Bob');
    const app = await createApp(alice.agent, { title: 'Secret', companyName: 'Private Co' });
    const note = (await alice.agent.post(`/api/applications/${app.id}/notes`).send({ content: 'mine' })).body.note;

    await bob.agent.get(`/api/applications/${app.id}`).expect(404);
    await bob.agent.patch(`/api/applications/${app.id}`).send({ title: 'Hacked' }).expect(404);
    await bob.agent.delete(`/api/applications/${app.id}`).expect(404);
    await bob.agent.post(`/api/applications/${app.id}/notes`).send({ content: 'x' }).expect(404);
    await bob.agent.patch(`/api/notes/${note.id}`).send({ content: 'x' }).expect(404);
    await bob.agent.delete(`/api/companies/${app.company.id}`).expect(404);
    // Bob cannot attach his application to Alice's company either.
    await bob.agent.post('/api/applications').send({ title: 'X', companyId: app.company.id }).expect(400);

    expect((await bob.agent.get('/api/applications')).body.total).toBe(0);
    expect((await alice.agent.get(`/api/applications/${app.id}`)).body.application.title).toBe('Secret');
  });

  it('links CV versions and clears the link when the CV is deleted', async () => {
    const { agent } = await signedInAgent();
    const cv = (await agent.post('/api/cv-versions').send({ name: 'Frontend CV' })).body.cvVersion;
    const app = await createApp(agent, { title: 'Role', companyName: 'G', cvVersionId: cv.id });

    const list = await agent.get('/api/cv-versions');
    expect(list.body.items[0]._count.applications).toBe(1);

    await agent.delete(`/api/cv-versions/${cv.id}`).expect(204);
    expect((await agent.get(`/api/applications/${app.id}`)).body.application.cvVersion).toBeNull();
  });
});
