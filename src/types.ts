export type Step = { id: string; title: string; done: boolean };

export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';

export type Task = {
  id: string;
  title: string;
  listId: string;
  done: boolean;
  important: boolean;
  // date (YYYY-MM-DD) the task was added to My Day; only counts when it equals today
  myDay: string | null;
  due: string | null;
  reminder: string | null;
  reminderFired: boolean;
  repeat: Repeat;
  steps: Step[];
  note: string;
  order: number;
  createdAt: number;
  completedAt: number | null;
};

export type TodoList = { id: string; name: string; theme: string; groupId?: string | null };

export type ListGroup = { id: string; name: string; collapsed: boolean };

export type SortKey = 'manual' | 'importance' | 'due' | 'title' | 'created';

export type GroupBy = 'none' | 'due' | 'importance' | 'list';

export type ViewPref = { sort: SortKey; asc: boolean; showCompleted: boolean; layout: 'list' | 'grid'; groupBy: GroupBy };

export type SmartListKey = 'important' | 'planned' | 'assigned' | 'all' | 'completed';

export type Settings = {
  theme: 'light' | 'dark' | 'system';
  addToTop: boolean;
  confirmDelete: boolean;
  playSound: boolean;
  smartLists: Record<SmartListKey, boolean>;
};

export type State = {
  tasks: Task[];
  lists: TodoList[];
  groups: ListGroup[];
  viewPrefs: Record<string, ViewPref>;
  settings: Settings;
};

// smart views plus `list:<id>` for user lists
export type ViewId = 'myday' | 'important' | 'planned' | 'assigned' | 'all' | 'completed' | 'tasks' | 'search' | 'settings' | `list:${string}`;
