import type { SortKey, State, Task, ViewId } from './types';
import { addDays, todayStr } from './date';

export const SMART: { id: ViewId; name: string; icon: string; color: string }[] = [
  { id: 'myday', name: '오늘 할 일', icon: 'sun', color: '#2564cf' },
  { id: 'important', name: '중요', icon: 'star', color: '#c239b3' },
  { id: 'planned', name: '계획된 일정', icon: 'calendar', color: '#107c41' },
  { id: 'all', name: '모두', icon: 'infinity', color: '#c50f1f' },
  { id: 'completed', name: '완료됨', icon: 'checkCircle', color: '#c50f1f' },
  { id: 'tasks', name: '작업', icon: 'home', color: '#2564cf' },
];

export function viewMeta(state: State, view: ViewId) {
  const smart = SMART.find((s) => s.id === view);
  if (smart) return { name: smart.name, icon: smart.icon, color: smart.color, custom: false };
  if (view === 'search') return { name: '검색', icon: 'search', color: '#2564cf', custom: false };
  const list = state.lists.find((l) => `list:${l.id}` === view);
  return { name: list?.name ?? '목록', icon: 'list', color: list?.theme ?? '#2564cf', custom: true };
}

export function inView(t: Task, view: ViewId, query = ''): boolean {
  switch (view) {
    case 'myday':
      return t.myDay === todayStr();
    case 'important':
      return t.important;
    case 'planned':
      return t.due !== null;
    case 'all':
      return true;
    case 'completed':
      return t.done;
    case 'tasks':
      return t.listId === 'tasks';
    case 'search': {
      const q = query.trim().toLowerCase();
      if (!q) return false;
      return (
        t.title.toLowerCase().includes(q) ||
        t.note.toLowerCase().includes(q) ||
        t.steps.some((s) => s.title.toLowerCase().includes(q))
      );
    }
    default:
      return view.startsWith('list:') && t.listId === view.slice(5);
  }
}

export function sortTasks(tasks: Task[], key: SortKey, asc: boolean): Task[] {
  const cmp: Record<SortKey, (a: Task, b: Task) => number> = {
    manual: (a, b) => a.order - b.order,
    importance: (a, b) => Number(b.important) - Number(a.important) || a.order - b.order,
    due: (a, b) => (a.due ?? '9999') .localeCompare(b.due ?? '9999') || a.order - b.order,
    title: (a, b) => a.title.localeCompare(b.title, 'ko'),
    created: (a, b) => b.createdAt - a.createdAt,
  };
  const sorted = [...tasks].sort(cmp[key]);
  return asc ? sorted : sorted.reverse();
}

export const SORT_LABEL: Record<SortKey, string> = {
  manual: '사용자 지정',
  importance: '중요도',
  due: '기한',
  title: '사전순',
  created: '만든 날짜',
};

// groups used by the Planned view
export function plannedGroup(due: string): string {
  const today = todayStr();
  if (due < today) return '이전';
  if (due === today) return '오늘';
  if (due === addDays(today, 1)) return '내일';
  if (due <= addDays(today, 7)) return '이번 주';
  return '나중에';
}

export const PLANNED_ORDER = ['이전', '오늘', '내일', '이번 주', '나중에'];
