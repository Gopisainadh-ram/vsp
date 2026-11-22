export * from '@vsp/shared';
export const errMsg = (e: any, fallback = 'Something went wrong. Please try again.'): string => e?.error?.message ?? fallback;
