import { Router } from 'express';
import { noteCreateSchema } from '@jobflow/shared';
import { prisma } from '../lib/prisma';
import { notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { parse } from '../middleware/validate';

export const notesRouter = Router();

notesRouter.patch('/:id', async (req, res) => {
  const { content } = parse(noteCreateSchema, req.body);
  const { count } = await prisma.note.updateMany({
    where: { id: req.params.id, application: { userId: currentUserId(req) } },
    data: { content },
  });
  if (count === 0) throw notFound('Note');
  res.json({ note: await prisma.note.findUniqueOrThrow({ where: { id: req.params.id } }) });
});

notesRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.note.deleteMany({
    where: { id: req.params.id, application: { userId: currentUserId(req) } },
  });
  if (count === 0) throw notFound('Note');
  res.status(204).end();
});
