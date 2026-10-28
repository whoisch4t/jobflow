import { z } from 'zod';
import {
  APPLICATION_SORTS,
  APPLICATION_STATUSES,
  INTERVIEW_OUTCOMES,
  INTERVIEW_TYPES,
  OFFER_DECISIONS,
  WORK_MODES,
} from './enums';

// Form inputs send "" for empty optional fields. Turn those into undefined/null.
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

const optionalText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const optionalUrl = z.preprocess(
  emptyToNull,
  z
    .url({ protocol: /^https?$/ })
    .max(2048)
    .nullable()
    .optional(),
);

const optionalInt = (min: number, max: number) =>
  z.preprocess(emptyToNull, z.coerce.number().int().min(min).max(max).nullable().optional());

const optionalDate = z.preprocess(emptyToNull, z.coerce.date().nullable().optional());

const id = z.string().min(1).max(64);

// ---------- Auth ----------

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.email('Enter a valid email').trim().toLowerCase().max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email('Enter a valid email').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------- Companies ----------

export const companyCreateSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(120),
  website: optionalUrl,
  location: optionalText(120),
  industry: optionalText(80),
  notes: optionalText(5000),
});
export const companyUpdateSchema = companyCreateSchema.partial();
export type CompanyCreateInput = z.input<typeof companyCreateSchema>;

// ---------- CV versions ----------

export const cvVersionCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  url: optionalUrl,
  description: optionalText(2000),
});
export const cvVersionUpdateSchema = cvVersionCreateSchema.partial();
export type CvVersionCreateInput = z.input<typeof cvVersionCreateSchema>;

// ---------- Applications ----------

const applicationBase = z.object({
  title: z.string().trim().min(1, 'Job title is required').max(160),
  status: z.enum(APPLICATION_STATUSES).default('WISHLIST'),
  jobUrl: optionalUrl,
  location: optionalText(120),
  workMode: z.preprocess(emptyToNull, z.enum(WORK_MODES).nullable().optional()),
  source: optionalText(80),
  salaryMin: optionalInt(0, 100_000_000),
  salaryMax: optionalInt(0, 100_000_000),
  currency: z.preprocess(emptyToNull, z.string().trim().toUpperCase().length(3).nullable().optional()),
  appliedAt: optionalDate,
  cvVersionId: z.preprocess(emptyToNull, id.nullable().optional()),
  description: optionalText(20000),
});

const salaryRangeIsValid = (v: { salaryMin?: number | null; salaryMax?: number | null }) =>
  v.salaryMin == null || v.salaryMax == null || v.salaryMin <= v.salaryMax;
const salaryRangeError = { message: 'Minimum salary cannot be above maximum', path: ['salaryMax'] };

/** Either pick an existing company (companyId) or create one on the fly (companyName). */
export const applicationCreateSchema = applicationBase
  .extend({
    companyId: z.preprocess(emptyToUndefined, id.optional()),
    companyName: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(120).optional()),
  })
  .refine((v) => v.companyId || v.companyName, {
    message: 'Choose a company or type a new one',
    path: ['companyName'],
  })
  .refine(salaryRangeIsValid, salaryRangeError);
export type ApplicationCreateInput = z.input<typeof applicationCreateSchema>;

export const applicationUpdateSchema = applicationBase
  .extend({ companyId: id })
  .partial()
  .refine(salaryRangeIsValid, salaryRangeError);
export type ApplicationUpdateInput = z.input<typeof applicationUpdateSchema>;

export const applicationStatusSchema = z.object({ status: z.enum(APPLICATION_STATUSES) });

export const applicationListQuerySchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  status: z.preprocess(
    (v) => (typeof v === 'string' ? (v === '' ? undefined : v.split(',')) : v),
    z.array(z.enum(APPLICATION_STATUSES)).optional(),
  ),
  workMode: z.preprocess(emptyToUndefined, z.enum(WORK_MODES).optional()),
  companyId: z.preprocess(emptyToUndefined, id.optional()),
  sort: z.preprocess(emptyToUndefined, z.enum(APPLICATION_SORTS).default('updated')),
  order: z.preprocess(emptyToUndefined, z.enum(['asc', 'desc']).default('desc')),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ApplicationListQuery = z.infer<typeof applicationListQuerySchema>;

// ---------- Interviews ----------

export const interviewCreateSchema = z.object({
  type: z.enum(INTERVIEW_TYPES),
  scheduledAt: z.coerce.date({ error: 'Pick a date and time' }),
  durationMinutes: optionalInt(5, 1440),
  interviewer: optionalText(160),
  location: optionalText(500),
  notes: optionalText(10000),
  outcome: z.enum(INTERVIEW_OUTCOMES).default('PENDING'),
});
export const interviewUpdateSchema = interviewCreateSchema.partial();
export type InterviewCreateInput = z.input<typeof interviewCreateSchema>;

// ---------- Offers ----------

export const offerUpsertSchema = z.object({
  salary: z.coerce.number().int().min(0).max(100_000_000),
  currency: z.string().trim().toUpperCase().length(3),
  bonus: optionalText(200),
  equity: optionalText(200),
  benefits: optionalText(5000),
  startDate: optionalDate,
  deadline: optionalDate,
  decision: z.enum(OFFER_DECISIONS).default('PENDING'),
});
export type OfferUpsertInput = z.input<typeof offerUpsertSchema>;

// ---------- Notes ----------

export const noteCreateSchema = z.object({
  content: z.string().trim().min(1, 'Note cannot be empty').max(10000),
});
export type NoteCreateInput = z.input<typeof noteCreateSchema>;
