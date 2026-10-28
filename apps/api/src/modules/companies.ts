import { Router } from 'express';
import { companyCreateSchema, companyUpdateSchema } from '@jobflow/shared';
import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { invalidateUserAnalytics } from '../lib/cache';
import { currentUserId } from '../middleware/auth';
import { parse } from '../middleware/validate';

export const companiesRouter = Router();

companiesRouter.get('/', async (req, res) => {
  const userId = currentUserId(req);
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const companies = await prisma.company.findMany({
    where: { userId, ...(q && { name: { contains: q, mode: 'insensitive' } }) },
    orderBy: { name: 'asc' },
    include: { _count: { select: { applications: true } } },
  });
  res.json({ items: companies });
});

companiesRouter.post('/', async (req, res) => {
  const userId = currentUserId(req);
  const input = parse(companyCreateSchema, req.body);
  const company = await prisma.company.create({ data: { ...input, userId } });
  res.status(201).json({ company });
});

companiesRouter.get('/:id', async (req, res) => {
  const company = await prisma.company.findFirst({
    where: { id: req.params.id, userId: currentUserId(req) },
    include: {
      applications: {
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, status: true, appliedAt: true, updatedAt: true },
      },
    },
  });
  if (!company) throw notFound('Company');
  res.json({ company });
});

companiesRouter.patch('/:id', async (req, res) => {
  const userId = currentUserId(req);
  const input = parse(companyUpdateSchema, req.body);
  const { count } = await prisma.company.updateMany({ where: { id: req.params.id, userId }, data: input });
  if (count === 0) throw notFound('Company');
  const company = await prisma.company.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json({ company });
});

/** Deleting a company also deletes its applications. */
companiesRouter.delete('/:id', async (req, res) => {
  const userId = currentUserId(req);
  const { count } = await prisma.company.deleteMany({ where: { id: req.params.id, userId } });
  if (count === 0) throw notFound('Company');
  invalidateUserAnalytics(userId);
  res.status(204).end();
});
