import { Router } from 'express';
import {
  applicationCreateSchema,
  applicationListQuerySchema,
  applicationStatusSchema,
  applicationUpdateSchema,
  interviewCreateSchema,
  noteCreateSchema,
  offerUpsertSchema,
  type ApplicationStatus,
} from '@jobflow/shared';
import { prisma } from '../lib/prisma';
import { badRequest, notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { parse } from '../middleware/validate';
import {
  appliedAtFor,
  assertOwnApplication,
  assertOwnCompany,
  assertOwnCvVersion,
  changeStatus,
  findOrCreateCompany,
  getApplicationDetail,
  listApplications,
  summarySelect,
  touched,
} from './applications.service';

export const applicationsRouter = Router();

// Scheduling an interview or receiving an offer moves the application forward automatically,
// but never backwards and never out of a closed state.
const AUTO_TO_INTERVIEWING: readonly ApplicationStatus[] = ['WISHLIST', 'APPLIED', 'SCREENING'];
const AUTO_TO_OFFER: readonly ApplicationStatus[] = ['WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEWING'];

applicationsRouter.get('/', async (req, res) => {
  const query = parse(applicationListQuerySchema, req.query);
  res.json(await listApplications(currentUserId(req), query));
});

applicationsRouter.post('/', async (req, res) => {
  const userId = currentUserId(req);
  const { companyId, companyName, ...input } = parse(applicationCreateSchema, req.body);

  const application = await prisma.$transaction(async (tx) => {
    await assertOwnCvVersion(userId, input.cvVersionId, tx);
    let resolvedCompanyId: string;
    if (companyId) {
      await assertOwnCompany(userId, companyId, tx);
      resolvedCompanyId = companyId;
    } else {
      resolvedCompanyId = await findOrCreateCompany(userId, companyName!, tx);
    }

    const created = await tx.application.create({
      data: {
        ...input,
        userId,
        companyId: resolvedCompanyId,
        appliedAt: appliedAtFor(input.status, input.appliedAt),
      },
      select: { id: true, status: true },
    });
    await tx.statusChange.create({ data: { applicationId: created.id, fromStatus: null, toStatus: created.status } });
    return tx.application.findUniqueOrThrow({ where: { id: created.id }, select: summarySelect });
  });

  touched(userId);
  res.status(201).json({ application });
});

applicationsRouter.get('/:id', async (req, res) => {
  res.json({ application: await getApplicationDetail(currentUserId(req), req.params.id) });
});

applicationsRouter.patch('/:id', async (req, res) => {
  const userId = currentUserId(req);
  const { status, ...input } = parse(applicationUpdateSchema, req.body);

  await prisma.$transaction(async (tx) => {
    const app = await assertOwnApplication(userId, req.params.id, tx);
    if (input.companyId) await assertOwnCompany(userId, input.companyId, tx);
    if (input.cvVersionId) await assertOwnCvVersion(userId, input.cvVersionId, tx);
    // The schema only compares fields sent together; also check against the stored values.
    const salaryMin = input.salaryMin === undefined ? app.salaryMin : input.salaryMin;
    const salaryMax = input.salaryMax === undefined ? app.salaryMax : input.salaryMax;
    if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
      throw badRequest('Validation failed', [{ path: 'salaryMax', message: 'Minimum salary cannot be above maximum' }]);
    }
    await tx.application.update({ where: { id: app.id }, data: input });
    if (status) {
      await changeStatus(tx, { ...app, appliedAt: input.appliedAt ?? app.appliedAt }, status);
    }
  });

  touched(userId);
  res.json({ application: await getApplicationDetail(userId, req.params.id) });
});

applicationsRouter.patch('/:id/status', async (req, res) => {
  const userId = currentUserId(req);
  const { status } = parse(applicationStatusSchema, req.body);
  await prisma.$transaction(async (tx) => {
    const app = await assertOwnApplication(userId, req.params.id, tx);
    await changeStatus(tx, app, status);
  });
  touched(userId);
  const application = await prisma.application.findUniqueOrThrow({
    where: { id: req.params.id },
    select: summarySelect,
  });
  res.json({ application });
});

applicationsRouter.delete('/:id', async (req, res) => {
  const userId = currentUserId(req);
  const { count } = await prisma.application.deleteMany({ where: { id: req.params.id, userId } });
  if (count === 0) throw notFound('Application');
  touched(userId);
  res.status(204).end();
});

// ---------- Interviews of one application ----------

applicationsRouter.post('/:id/interviews', async (req, res) => {
  const userId = currentUserId(req);
  const input = parse(interviewCreateSchema, req.body);
  const interview = await prisma.$transaction(async (tx) => {
    const app = await assertOwnApplication(userId, req.params.id, tx);
    const created = await tx.interview.create({ data: { ...input, applicationId: app.id } });
    await changeStatus(tx, app, 'INTERVIEWING', AUTO_TO_INTERVIEWING);
    return created;
  });
  touched(userId);
  res.status(201).json({ interview });
});

// ---------- Offer (one per application) ----------

applicationsRouter.put('/:id/offer', async (req, res) => {
  const userId = currentUserId(req);
  const input = parse(offerUpsertSchema, req.body);
  const offer = await prisma.$transaction(async (tx) => {
    const app = await assertOwnApplication(userId, req.params.id, tx);
    const saved = await tx.offer.upsert({
      where: { applicationId: app.id },
      create: { ...input, applicationId: app.id },
      update: input,
    });
    await changeStatus(tx, app, 'OFFER', AUTO_TO_OFFER);
    if (input.decision === 'ACCEPTED') {
      const current = await assertOwnApplication(userId, app.id, tx);
      await changeStatus(tx, current, 'ACCEPTED', ['OFFER']);
    }
    return saved;
  });
  touched(userId);
  res.json({ offer });
});

applicationsRouter.delete('/:id/offer', async (req, res) => {
  const userId = currentUserId(req);
  const app = await assertOwnApplication(userId, req.params.id);
  const { count } = await prisma.offer.deleteMany({ where: { applicationId: app.id } });
  if (count === 0) throw notFound('Offer');
  touched(userId);
  res.status(204).end();
});

// ---------- Notes ----------

applicationsRouter.post('/:id/notes', async (req, res) => {
  const userId = currentUserId(req);
  const { content } = parse(noteCreateSchema, req.body);
  const app = await assertOwnApplication(userId, req.params.id);
  const note = await prisma.note.create({ data: { content, applicationId: app.id } });
  // Adding a note counts as activity on the application.
  await prisma.application.update({ where: { id: app.id }, data: { updatedAt: new Date() } });
  res.status(201).json({ note });
});
