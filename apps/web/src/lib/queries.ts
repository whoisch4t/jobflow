'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AnalyticsOverview,
  AppNotification,
  ApplicationDetail,
  ApplicationStatus,
  ApplicationSummary,
  Company,
  CvVersion,
  InterviewWithApplication,
  Paginated,
  User,
} from '@jobflow/shared';
import { api } from './api';

export const keys = {
  me: ['me'] as const,
  applications: ['applications'] as const,
  applicationList: (query: object) => ['applications', 'list', query] as const,
  application: (id: string) => ['applications', 'detail', id] as const,
  companies: ['companies'] as const,
  company: (id: string) => ['companies', id] as const,
  cvVersions: ['cv-versions'] as const,
  interviews: (range: string) => ['interviews', range] as const,
  analytics: ['analytics'] as const,
  notifications: ['notifications'] as const,
};

export interface ApplicationQuery {
  q?: string;
  status?: ApplicationStatus[];
  workMode?: string;
  companyId?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => api<{ user: User }>('/auth/me').then((r) => r.user) });

export const useApplications = (query: ApplicationQuery) =>
  useQuery({
    queryKey: keys.applicationList(query),
    queryFn: () => api<Paginated<ApplicationSummary>>('/applications', { query: { ...query } }),
    placeholderData: (previous) => previous,
  });

export const useApplication = (id: string) =>
  useQuery({
    queryKey: keys.application(id),
    queryFn: () => api<{ application: ApplicationDetail }>(`/applications/${id}`).then((r) => r.application),
  });

export const useCompanies = () =>
  useQuery({ queryKey: keys.companies, queryFn: () => api<{ items: Company[] }>('/companies').then((r) => r.items) });

export const useCompany = (id: string) =>
  useQuery({
    queryKey: keys.company(id),
    queryFn: () =>
      api<{
        company: Company & {
          applications: Pick<ApplicationSummary, 'id' | 'title' | 'status' | 'appliedAt' | 'updatedAt'>[];
        };
      }>(`/companies/${id}`).then((r) => r.company),
  });

export const useCvVersions = () =>
  useQuery({
    queryKey: keys.cvVersions,
    queryFn: () => api<{ items: CvVersion[] }>('/cv-versions').then((r) => r.items),
  });

export const useInterviews = (range: 'upcoming' | 'past') =>
  useQuery({
    queryKey: keys.interviews(range),
    queryFn: () => api<{ items: InterviewWithApplication[] }>('/interviews', { query: { range } }).then((r) => r.items),
  });

export const useAnalytics = () =>
  useQuery({ queryKey: keys.analytics, queryFn: () => api<AnalyticsOverview>('/analytics/overview') });

export const useNotifications = () =>
  useQuery({
    queryKey: keys.notifications,
    queryFn: () => api<{ items: AppNotification[] }>('/notifications').then((r) => r.items),
    refetchInterval: 5 * 60_000,
  });

/** After any write, refresh everything that may show the changed data. */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.applications }),
      qc.invalidateQueries({ queryKey: keys.companies }),
      qc.invalidateQueries({ queryKey: keys.cvVersions }),
      qc.invalidateQueries({ queryKey: ['interviews'] }),
      qc.invalidateQueries({ queryKey: keys.analytics }),
      qc.invalidateQueries({ queryKey: keys.notifications }),
    ]);
}

/** Generic write helper: runs `fn`, then refreshes all lists. */
export function useWrite<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate() });
}

/** Changes status from the board or list, updating the cached lists right away. */
export function useMoveApplication() {
  const qc = useQueryClient();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      api(`/applications/${id}/status`, { method: 'PATCH', body: { status } }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: keys.applications });
      const snapshots = qc.getQueriesData<Paginated<ApplicationSummary>>({ queryKey: ['applications', 'list'] });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        qc.setQueryData(key, { ...data, items: data.items.map((a) => (a.id === id ? { ...a, status } : a)) });
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.snapshots ?? []) qc.setQueryData(key, data);
    },
    onSettled: () => invalidate(),
  });
}
