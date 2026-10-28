// These values must stay in sync with the enums in apps/api/prisma/schema.prisma.

export const APPLICATION_STATUSES = [
  'WISHLIST',
  'APPLIED',
  'SCREENING',
  'INTERVIEWING',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses that count as "the company responded" for analytics. */
export const RESPONDED_STATUSES: readonly ApplicationStatus[] = [
  'SCREENING',
  'INTERVIEWING',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
];

/** Statuses where the process is over. */
export const CLOSED_STATUSES: readonly ApplicationStatus[] = ['ACCEPTED', 'REJECTED', 'WITHDRAWN'];

export const WORK_MODES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const INTERVIEW_TYPES = [
  'PHONE',
  'TECHNICAL',
  'BEHAVIORAL',
  'SYSTEM_DESIGN',
  'TAKE_HOME',
  'ONSITE',
  'OTHER',
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_OUTCOMES = ['PENDING', 'PASSED', 'FAILED', 'CANCELLED'] as const;
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];

export const OFFER_DECISIONS = ['PENDING', 'ACCEPTED', 'DECLINED'] as const;
export type OfferDecision = (typeof OFFER_DECISIONS)[number];

export const APPLICATION_SORTS = ['updated', 'created', 'applied', 'company', 'title'] as const;
export type ApplicationSort = (typeof APPLICATION_SORTS)[number];
