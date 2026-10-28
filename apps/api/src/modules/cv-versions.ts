import { Router } from 'express';
import { cvVersionCreateSchema, cvVersionUpdateSchema } from '@jobflow/shared';
import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { parse } from '../middleware/validate';

export const cvVersionsRouter = Router();

cvVersionsRouter.get('/', async (req, res) => {
  const items = await prisma.cvVersion.findMany({
    where: { userId: currentUserId(req) },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { applications: true } } },
  });
  res.json({ items });
});

cvVersionsRouter.post('/', async (req, res) => {
  const input = parse(cvVersionCreateSchema, req.body);
  const cvVersion = await prisma.cvVersion.create({ data: { ...input, userId: currentUserId(req) } });
  res.status(201).json({ cvVersion });
});

cvVersionsRouter.patch('/:id', async (req, res) => {
  const userId = currentUserId(req);
  const input = parse(cvVersionUpdateSchema, req.body);
  const { count } = await prisma.cvVersion.updateMany({ where: { id: req.params.id, userId }, data: input });
  if (count === 0) throw notFound('CV version');
  const cvVersion = await prisma.cvVersion.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json({ cvVersion });
});

/** Applications that used this CV keep existing; their CV link is cleared. */
cvVersionsRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.cvVersion.deleteMany({ where: { id: req.params.id, userId: currentUserId(req) } });
  if (count === 0) throw notFound('CV version');
  res.status(204).end();
});
