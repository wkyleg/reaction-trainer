import type { SessionReport } from './SessionRecorder';

const MAX_REPORTS = 30;

export function getStorageKey(appName: string): string {
  return `${appName}-reports`;
}

export function saveReport(appName: string, report: SessionReport): void {
  try {
    const existing = getReports(appName);
    existing.push(report);
    while (existing.length > MAX_REPORTS) existing.shift();
    localStorage.setItem(getStorageKey(appName), JSON.stringify(existing));
  } catch (e) {
    console.warn('[ReportStorage] Failed to save report:', e);
  }
}

export function getReports(appName: string): SessionReport[] {
  try {
    const raw = localStorage.getItem(getStorageKey(appName));
    if (!raw) return [];
    return JSON.parse(raw) as SessionReport[];
  } catch {
    return [];
  }
}

export function downloadReport(appName: string, report: SessionReport): void {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${appName}-${report.sessionType}-${report.startTime}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
