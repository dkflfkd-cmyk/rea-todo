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

export type TodoList = { id: string; name: string; theme: string };

export type SortKey = 'manual' | 'importance' | 'due' | 'title' | 'created';

export type ViewPref = { sort: SortKey; asc: boolean; showCompleted: boolean };

export type SmartListKey = 'important' | 'planned' | 'all' | 'completed';

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
  viewPrefs: Record<string, ViewPref>;
  settings: Settings;
};

// smart views plus `list:<id>` for user lists
export type ViewId = 'myday' | 'important' | 'planned' | 'all' | 'completed' | 'tasks' | 'search' | 'settings' | `list:${string}`;
