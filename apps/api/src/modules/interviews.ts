import { Router } from 'express';
import { z } from 'zod';
import { interviewUpdateSchema } from '@jobflow/shared';
import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { parse } from '../middleware/validate';
import { touched } from './applications.service';

export const interviewsRouter = Router();

const listQuery = z.object({
  range: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** Interviews across all of the user's applications. */
interviewsRouter.get('/', async (req, res) => {
  const { range, limit } = parse(listQuery, req.query);
  const now = new Date();
  const items = await prisma.interview.findMany({
    where: {
      application: { userId: currentUserId(req) },
      ...(range === 'upcoming' && { scheduledAt: { gte: now } }),
      ...(range === 'past' && { scheduledAt: { lt: now } }),
    },
    orderBy: { scheduledAt: range === 'past' ? 'desc' : 'asc' },
    take: limit,
    include: { application: { select: { id: true, title: true, company: { select: { id: true, name: true } } } } },
  });
  res.json({ items });
});

interviewsRouter.patch('/:id', async (req, res) => {
  const userId = currentUserId(req);
  const input = parse(interviewUpdateSchema, req.body);
  const { count } = await prisma.interview.updateMany({
    where: { id: req.params.id, application: { userId } },
    data: input,
  });
  if (count === 0) throw notFound('Interview');
  touched(userId);
  res.json({ interview: await prisma.interview.findUniqueOrThrow({ where: { id: req.params.id } }) });
});

interviewsRouter.delete('/:id', async (req, res) => {
  const userId = currentUserId(req);
  const { count } = await prisma.interview.deleteMany({ where: { id: req.params.id, application: { userId } } });
  if (count === 0) throw notFound('Interview');
  touched(userId);
  res.status(204).end();
});
