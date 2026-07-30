import { ValidationError } from '@src/shared/domain/exceptions/PlatformError';

export interface ReportingPeriod {
  readonly from: string;
  readonly to: string;
  readonly timeZone: string;
}

export function validateReportingPeriod(input: ReportingPeriod): ReportingPeriod {
  assertDate(input.from, 'Report from date');
  assertDate(input.to, 'Report to date');
  if (input.from > input.to) throw new ValidationError('Report from date must not be after to date.');
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: input.timeZone });
  } catch {
    throw new ValidationError('Report time zone must be a valid IANA time zone.');
  }
  return input;
}

export function localDayUtcRange(date: string, timeZone: string): { readonly start: Date; readonly end: Date } {
  validateReportingPeriod({ from: date, to: date, timeZone });
  return { start: localMidnightUtc(date, timeZone), end: localMidnightUtc(addDays(date, 1), timeZone) };
}

export function daysInPeriod(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function assertDate(date: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))) {
    throw new ValidationError(`${label} must use a valid YYYY-MM-DD date.`);
  }
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function localMidnightUtc(date: string, timeZone: string): Date {
  let timestamp = Date.parse(`${date}T00:00:00.000Z`);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = localParts(new Date(timestamp), timeZone);
    const localTimestamp = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    timestamp += Date.parse(`${date}T00:00:00.000Z`) - localTimestamp;
  }
  return new Date(timestamp);
}

function localParts(value: Date, timeZone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  return Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)])
  );
}
