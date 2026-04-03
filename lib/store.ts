import type { Report } from './types';

// In-memory report store with 24h TTL
// (Reports are ephemeral — Supabase handles email/IP tracking)
const reports = new Map<string, { report: Report; expiresAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function saveReport(report: Report): void {
  // Clean expired entries periodically
  if (reports.size > 100) {
    const now = Date.now();
    for (const [key, val] of reports) {
      if (val.expiresAt < now) reports.delete(key);
    }
  }

  reports.set(report.id, {
    report,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function getReport(id: string): Report | null {
  const entry = reports.get(id);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    reports.delete(id);
    return null;
  }
  return entry.report;
}
