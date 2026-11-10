import { createContext, useContext, useEffect, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { Settings, State, Step, Task, TodoList, ViewId, ViewPref } from './types';
import { nextDue, todayStr } from './date';

const KEY = 'rea-todo-state-v1';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const THEMES = ['#2564cf', '#788cde', '#bc7abc', '#e46c8c', '#e3655b', '#4aa079', '#3f8a8a', '#8a8886'];
export const THEME_NAMES = ['파랑', '연보라', '보라', '분홍', '빨강', '초록', '청록', '회색'];

const defaultSettings: Settings = {
  theme: 'light',
  addToTop: true,
  confirmDelete: true,
  playSound: true,
  smartLists: { important: true, planned: true, all: false, completed: false },
};

export const defaultPref = (view: string): ViewPref => ({
  sort: 'manual',
  asc: true,
  showCompleted: view !== 'important' && view !== 'planned',
});

function initialState(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      return { ...s, settings: { ...defaultSettings, ...s.settings } };
    }
  } catch {
    // storage blocked or corrupted: start fresh
  }
  return { tasks: [], lists: [], viewPrefs: {}, settings: defaultSettings };
}

export type Action =
  | { type: 'addTask'; id: string; title: string; view: ViewId }
  | { type: 'updateTask'; id: string; patch: Partial<Task> }
  | { type: 'toggleDone'; id: string }
  | { type: 'deleteTask'; id: string }
  | { type: 'reorder'; id: string; beforeId: string | null }
  | { type: 'addStep'; taskId: string; title: string }
  | { type: 'updateStep'; taskId: string; stepId: string; patch: Partial<Step> }
  | { type: 'deleteStep'; taskId: string; stepId: string }
  | { type: 'promoteStep'; taskId: string; stepId: string }
  | { type: 'addList'; list: TodoList }
  | { type: 'updateList'; id: string; patch: Partial<TodoList> }
  | { type: 'deleteList'; id: string }
  | { type: 'setViewPref'; view: string; patch: Partial<ViewPref> }
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'replaceData'; tasks: Task[]; lists: TodoList[] };

function newTask(state: State, id: string, title: string, view: ViewId): Task {
  const orders = state.tasks.map((t) => t.order);
  const order = orders.length === 0 ? 0 : state.settings.addToTop ? Math.min(...orders) - 1 : Math.max(...orders) + 1;
  const today = todayStr();
  return {
    id,
    title,
    listId: view.startsWith('list:') ? view.slice(5) : 'tasks',
    done: false,
    important: view === 'important',
    myDay: view === 'myday' ? today : null,
    due: view === 'planned' ? today : null,
    reminder: null,
    reminderFired: false,
    repeat: 'none',
    steps: [],
    note: '',
    order,
    createdAt: Date.now(),
    completedAt: null,
  };
}

function mapTask(state: State, id: string, fn: (t: Task) => Task): State {
  return { ...state, tasks: state.tasks.map((t) => (t.id === id ? fn(t) : t)) };
}

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case 'addTask':
      return { ...state, tasks: [...state.tasks, newTask(state, a.id, a.title, a.view)] };
    case 'updateTask':
      return mapTask(state, a.id, (t) => {
        const next = { ...t, ...a.patch };
        if (a.patch.reminder !== undefined && a.patch.reminderFired === undefined) next.reminderFired = false;
        // a repeating task needs a due date to repeat from
        if (a.patch.repeat && a.patch.repeat !== 'none' && !next.due) next.due = todayStr();
        return next;
      });
    case 'toggleDone': {
      const t = state.tasks.find((x) => x.id === a.id);
      if (!t) return state;
      let s = mapTask(state, a.id, (x) => ({ ...x, done: !x.done, completedAt: x.done ? null : Date.now() }));
      // completing a repeating task spawns the next occurrence, like the original app
      if (!t.done && t.repeat !== 'none' && t.due) {
        const copy: Task = {
          ...t,
          id: uid(),
          done: false,
          completedAt: null,
          due: nextDue(t.due, t.repeat),
          steps: t.steps.map((st) => ({ ...st, id: uid(), done: false })),
          reminderFired: false,
          createdAt: Date.now(),
        };
        s = { ...s, tasks: [...s.tasks, copy] };
      }
      return s;
    }
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== a.id) };
    case 'reorder': {
      const sorted = [...state.tasks].sort((x, y) => x.order - y.order);
      const moving = sorted.find((t) => t.id === a.id);
      if (!moving || a.id === a.beforeId) return state;
      const rest = sorted.filter((t) => t.id !== a.id);
      const idx = a.beforeId ? rest.findIndex((t) => t.id === a.beforeId) : rest.length;
      rest.splice(idx < 0 ? rest.length : idx, 0, moving);
      const orderOf = new Map(rest.map((t, i) => [t.id, i]));
      return { ...state, tasks: state.tasks.map((t) => ({ ...t, order: orderOf.get(t.id) ?? t.order })) };
    }
    case 'addStep':
      return mapTask(state, a.taskId, (t) => ({ ...t, steps: [...t.steps, { id: uid(), title: a.title, done: false }] }));
    case 'updateStep':
      return mapTask(state, a.taskId, (t) => ({
        ...t,
        steps: t.steps.map((st) => (st.id === a.stepId ? { ...st, ...a.patch } : st)),
      }));
    case 'deleteStep':
      return mapTask(state, a.taskId, (t) => ({ ...t, steps: t.steps.filter((st) => st.id !== a.stepId) }));
    case 'promoteStep': {
      const t = state.tasks.find((x) => x.id === a.taskId);
      const st = t?.steps.find((x) => x.id === a.stepId);
      if (!t || !st) return state;
      const s = reducer(state, { type: 'deleteStep', taskId: a.taskId, stepId: a.stepId });
      const created = newTask(s, uid(), st.title, `list:${t.listId}`);
      return { ...s, tasks: [...s.tasks, { ...created, listId: t.listId }] };
    }
    case 'addList':
      return { ...state, lists: [...state.lists, a.list] };
    case 'updateList':
      return { ...state, lists: state.lists.map((l) => (l.id === a.id ? { ...l, ...a.patch } : l)) };
    case 'deleteList':
      return {
        ...state,
        lists: state.lists.filter((l) => l.id !== a.id),
        tasks: state.tasks.filter((t) => t.listId !== a.id),
      };
    case 'setViewPref': {
      const cur = state.viewPrefs[a.view] ?? defaultPref(a.view);
      return { ...state, viewPrefs: { ...state.viewPrefs, [a.view]: { ...cur, ...a.patch } } };
    }
    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...a.patch } };
    case 'replaceData':
      return { ...state, tasks: a.tasks, lists: a.lists, viewPrefs: {} };
  }
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // ignore quota / private mode
    }
  }, [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}

export function listName(state: State, id: string): string {
  if (id === 'tasks') return '작업';
  return state.lists.find((l) => l.id === id)?.name ?? '작업';
}

export function playDing() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 1046;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch {
    // audio unavailable
  }
}
