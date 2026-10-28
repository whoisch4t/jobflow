// Shapes returned by the REST API (dates are ISO strings once serialised as JSON).
import type { ApplicationStatus, InterviewOutcome, InterviewType, OfferDecision, WorkMode } from './enums';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  website: string | null;
  location: string | null;
  industry: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { applications: number };
}

export interface CvVersion {
  id: string;
  name: string;
  url: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { applications: number };
}

export interface ApplicationSummary {
  id: string;
  title: string;
  status: ApplicationStatus;
  location: string | null;
  workMode: WorkMode | null;
  source: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  jobUrl: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: Pick<Company, 'id' | 'name'>;
  cvVersion: Pick<CvVersion, 'id' | 'name'> | null;
  _count: { interviews: number; notes: number };
}

export interface StatusChange {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  type: InterviewType;
  scheduledAt: string;
  durationMinutes: number | null;
  interviewer: string | null;
  location: string | null;
  notes: string | null;
  outcome: InterviewOutcome;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewWithApplication extends Interview {
  application: { id: string; title: string; company: Pick<Company, 'id' | 'name'> };
}

export interface Offer {
  id: string;
  applicationId: string;
  salary: number;
  currency: string;
  bonus: string | null;
  equity: string | null;
  benefits: string | null;
  startDate: string | null;
  deadline: string | null;
  decision: OfferDecision;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  description: string | null;
  company: Company;
  interviews: Interview[];
  offer: Offer | null;
  notes: Note[];
  statusHistory: StatusChange[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AnalyticsOverview {
  totals: {
    applications: number;
    active: number;
    applied: number;
    interviews: number;
    upcomingInterviews: number;
    offers: number;
  };
  rates: {
    /** Share of submitted applications that got any reply (0..1). */
    response: number;
    /** Share of submitted applications that reached an interview (0..1). */
    interview: number;
    /** Share of submitted applications that reached an offer (0..1). */
    offer: number;
  };
  byStatus: Record<ApplicationStatus, number>;
  funnel: { stage: ApplicationStatus; count: number }[];
  weekly: { weekStart: string; count: number }[];
  bySource: { source: string; count: number }[];
  avgDaysToFirstResponse: number | null;
}

export type NotificationKind = 'INTERVIEW_SOON' | 'OFFER_DEADLINE' | 'FOLLOW_UP';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  applicationId: string;
  title: string;
  company: string;
  date: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
}
