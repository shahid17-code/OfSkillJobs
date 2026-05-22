// lib/analytics.ts

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const event = (action: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params);
  } else {
    console.debug('[GA] Event queued:', action, params);
  }
};

export const trackJobListView = (jobCount: number, filter: string) => {
  event('view_job_list', { job_count: jobCount, filter_type: filter });
};

export const trackJobDetailView = (jobId: string, jobTitle: string, isCurated: boolean) => {
  event('view_job_detail', { job_id: jobId, job_title: jobTitle, is_curated: isCurated });
};

export const trackApplyClick = (jobId: string, jobTitle: string, method: 'internal' | 'external') => {
  event('apply_click', { job_id: jobId, job_title: jobTitle, apply_method: method });
};

export const trackApplicationSubmit = (jobId: string, jobTitle: string) => {
  event('submit_application', { job_id: jobId, job_title: jobTitle });
};

export const trackSignupStart = (sourcePage: string) => {
  event('signup_start', { source_page: sourcePage });
};

export const trackSearch = (searchTerm: string, filter?: string) => {
  event('search_jobs', { search_term: searchTerm, filter_type: filter || 'none' });
};

export const trackFilterChange = (filter: string) => {
  event('filter_change', { filter_type: filter });
};

export const trackRefresh = () => {
  event('refresh_jobs', {});
};

export const trackShare = (platform: string) => {
  event('share_profile', { platform });
};