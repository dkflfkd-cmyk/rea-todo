import type { Repeat } from './types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function fmt(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayStr = () => fmt(new Date());

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000);
}

export function nextMonday(s: string): string {
  const d = parse(s);
  const add = ((8 - d.getDay()) % 7) || 7;
  return addDays(s, add);
}

export function longDate(s: string): string {
  const d = parse(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

export function dueLabel(s: string): { text: string; overdue: boolean; today: boolean } {
  const diff = diffDays(s, todayStr());
  const d = parse(s);
  let text = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
  if (diff === 0) text = '오늘';
  else if (diff === 1) text = '내일';
  else if (diff === -1) text = '어제';
  if (d.getFullYear() !== new Date().getFullYear()) text = `${d.getFullYear()}년 ${text}`;
  return { text, overdue: diff < 0, today: diff === 0 };
}

export function reminderLabel(iso: string): string {
  const d = new Date(iso);
  const day = fmt(d);
  const diff = diffDays(day, todayStr());
  const time = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return `오늘 ${time}에 알림`;
  if (diff === 1) return `내일 ${time}에 알림`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${time}에 알림`;
}

export const REPEAT_LABEL: Record<Repeat, string> = {
  none: '반복',
  daily: '매일',
  weekdays: '평일',
  weekly: '매주',
  monthly: '매월',
  yearly: '매년',
};

export function nextDue(s: string, repeat: Repeat): string {
  const d = parse(s);
  switch (repeat) {
    case 'daily':
      return addDays(s, 1);
    case 'weekdays': {
      const day = d.getDay();
      return addDays(s, day === 5 ? 3 : day === 6 ? 2 : 1);
    }
    case 'weekly':
      return addDays(s, 7);
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      return fmt(d);
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      return fmt(d);
    default:
      return s;
  }
}

export function createdLabel(ts: number): string {
  const diff = diffDays(todayStr(), fmt(new Date(ts)));
  if (diff <= 0) return '오늘 만듦';
  if (diff === 1) return '어제 만듦';
  return `${diff}일 전에 만듦`;
}

// local datetime string for <input type="datetime-local">
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${fmt(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
