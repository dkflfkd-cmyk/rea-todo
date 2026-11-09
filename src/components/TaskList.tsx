import { useState } from 'react';
import type { SortKey, Task, ViewId } from '../types';
import { THEMES, THEME_NAMES, defaultPref, uid, useStore } from '../store';
import { inView, plannedGroup, PLANNED_ORDER, sortTasks, SORT_LABEL, viewMeta } from '../views';
import { longDate, todayStr } from '../date';
import { Icon } from '../icons';
import { Menu } from './Menu';
import type { MenuItem } from './Menu';
import { TaskItem } from './TaskItem';
import { Suggestions } from './Suggestions';

type Props = {
  view: ViewId;
  query: string;
  selectedId: string | null;
  onSelectTask: (id: string | null) => void;
  onDeleteTask: (id: string) => void;
  onDeleteList: (id: string) => void;
  addRef: React.RefObject<HTMLInputElement | null>;
};

export function TaskList({ view, query, selectedId, onSelectTask, onDeleteTask, onDeleteList, addRef }: Props) {
  const { state, dispatch } = useStore();
  const [title, setTitle] = useState('');
  const [menu, setMenu] = useState<{ kind: 'sort' | 'more'; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(true);

  const meta = viewMeta(state, view);
  const pref = state.viewPrefs[view] ?? defaultPref(view);
  const listId = view.startsWith('list:') ? view.slice(5) : null;
  const all = state.tasks.filter((t) => inView(t, view, query));
  const open = sortTasks(all.filter((t) => !t.done), pref.sort, pref.asc);
  const done = sortTasks(all.filter((t) => t.done), pref.sort === 'manual' ? 'created' : pref.sort, pref.asc);
  const canAdd = view !== 'search' && view !== 'completed';
  const canDrag = pref.sort === 'manual' && view !== 'search';

  function add() {
    const t = title.trim();
    if (!t) return;
    dispatch({ type: 'addTask', id: uid(), title: t, view });
    setTitle('');
  }

  const setSort = (sort: SortKey) => dispatch({ type: 'setViewPref', view, patch: { sort, asc: true } });

  const sortItems: MenuItem[] = (['importance', 'due', 'title', 'created'] as SortKey[])
    .filter((k) => !(view === 'important' && k === 'importance') && !(view === 'planned' && k === 'due'))
    .map((k) => ({ label: SORT_LABEL[k], icon: 'sort', checked: pref.sort === k, onClick: () => setSort(k) }));

  const moreItems: MenuItem[] = [
    ...(listId ? [{ label: '목록 이름 바꾸기', icon: 'edit', onClick: () => setRenaming(true) }] : []),
    {
      label: '정렬 기준',
      icon: 'sort',
      // the menu closes itself after a click, so reopen as the sort menu on the next tick
      onClick: () => setTimeout(() => setMenu((m) => ({ kind: 'sort', x: m?.x ?? 400, y: m?.y ?? 120 })), 0),
    },
    ...(listId
      ? THEMES.map((c, i) => ({
          label: `테마: ${THEME_NAMES[i]}`,
          icon: 'palette',
          checked: meta.color === c,
          onClick: () => dispatch({ type: 'updateList', id: listId, patch: { theme: c } }),
        }))
      : []),
    {
      label: pref.showCompleted ? '완료된 작업 숨기기' : '완료된 작업 표시',
      icon: 'eye',
      onClick: () => dispatch({ type: 'setViewPref', view, patch: { showCompleted: !pref.showCompleted } }),
    },
    { label: '목록 인쇄', icon: 'print', onClick: () => window.print() },
    ...(listId ? [{ divider: true as const }, { label: '목록 삭제', icon: 'trash', danger: true, onClick: () => onDeleteList(listId) }] : []),
  ];

  const renderTask = (t: Task) => (
    <TaskItem
      key={t.id}
      task={t}
      view={view}
      selected={selectedId === t.id}
      onSelect={() => onSelectTask(t.id)}
      onDelete={() => onDeleteTask(t.id)}
      draggable={canDrag && !t.done}
      onDropBefore={(dragId) => dispatch({ type: 'reorder', id: dragId, beforeId: t.id })}
    />
  );

  let body: React.ReactNode;
  if (view === 'planned') {
    const groups = PLANNED_ORDER.map((g) => ({ g, items: open.filter((t) => plannedGroup(t.due!) === g) })).filter((x) => x.items.length);
    body = groups.map(({ g, items }) => (
      <Group key={g} title={g} count={items.length}>
        {items.map(renderTask)}
      </Group>
    ));
  } else if (view === 'completed') {
    body = done.map(renderTask);
  } else {
    body = (
      <>
        {open.map(renderTask)}
        {pref.showCompleted && done.length > 0 && (
          <div className="group">
            <button className="group-head" onClick={() => setCompletedOpen(!completedOpen)}>
              <Icon name={completedOpen ? 'chevronDown' : 'chevronRight'} size={16} />
              완료됨 <span className="group-count">{done.length}</span>
            </button>
            {completedOpen && done.map(renderTask)}
          </div>
        )}
      </>
    );
  }

  const empty = all.length === 0;

  return (
    <section className="main" style={{ ['--accent' as string]: meta.color }}>
      <header className="main-head">
        <div className="title-row">
          <span className="title-icon">
            <Icon name={meta.icon} size={22} />
          </span>
          {renaming && listId ? (
            <input
              className="title-input"
              autoFocus
              defaultValue={meta.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v) dispatch({ type: 'updateList', id: listId, patch: { name: v } });
                setRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setRenaming(false);
              }}
            />
          ) : (
            <h1 onDoubleClick={() => listId && setRenaming(true)}>{view === 'search' ? `"${query}" 검색 결과` : meta.name}</h1>
          )}
          {view !== 'search' && (
            <button className="icon-btn" aria-label="목록 옵션" title="목록 옵션" onClick={(e) => setMenu({ kind: 'more', x: e.clientX, y: e.clientY + 12 })}>
              <Icon name="more" />
            </button>
          )}
          <div className="spacer" />
          {view !== 'search' && view !== 'planned' && (
            <button className="text-btn" onClick={(e) => setMenu({ kind: 'sort', x: e.clientX - 160, y: e.clientY + 12 })}>
              <Icon name="sort" size={16} /> 정렬
            </button>
          )}
          {view === 'myday' && (
            <button className={`text-btn${showSuggest ? ' pressed' : ''}`} onClick={() => setShowSuggest(!showSuggest)}>
              <Icon name="bulb" size={16} /> 추천
            </button>
          )}
        </div>
        {view === 'myday' && <div className="subtitle">{longDate(todayStr())}</div>}
        {pref.sort !== 'manual' && view !== 'search' && (
          <div className="sort-chip">
            <button onClick={() => dispatch({ type: 'setViewPref', view, patch: { asc: !pref.asc } })} aria-label="정렬 순서 바꾸기">
              <Icon name={pref.asc ? 'arrowUp' : 'arrowDown'} size={14} />
            </button>
            {SORT_LABEL[pref.sort]} 순으로 정렬됨
            <button onClick={() => setSort('manual')} aria-label="정렬 제거">
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
      </header>

      <div className="main-body">
        {canAdd && (
          <div className="add-bar">
            <Icon name="plus" />
            <input
              ref={addRef}
              value={title}
              placeholder="작업 추가"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            {title.trim() && (
              <button className="text-btn" onClick={add}>
                추가
              </button>
            )}
          </div>
        )}
        <div className="tasks">{body}</div>
        {empty && <EmptyState view={view} query={query} />}
      </div>

      {showSuggest && view === 'myday' && <Suggestions onClose={() => setShowSuggest(false)} />}
      {menu && <Menu x={menu.x} y={menu.y} items={menu.kind === 'sort' ? sortItems : moreItems} onClose={() => setMenu(null)} />}
    </section>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="group">
      <button className="group-head" onClick={() => setOpen(!open)}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} />
        {title} <span className="group-count">{count}</span>
      </button>
      {open && children}
    </div>
  );
}

function EmptyState({ view, query }: { view: ViewId; query: string }) {
  const text: Partial<Record<ViewId, [string, string]>> = {
    myday: ['하루에 집중하세요', '매일 새로 시작하는 목록으로 할 일을 끝내세요.'],
    important: ['중요한 작업에 별표를 표시하세요', '별표 표시한 작업이 여기에 모입니다.'],
    planned: ['기한이 있는 작업이 여기에 표시됩니다', '작업에 기한을 추가해 보세요.'],
    completed: ['아직 완료된 작업이 없습니다', '작업을 완료하면 여기에 표시됩니다.'],
  };
  if (view === 'search') {
    return <div className="empty">{query.trim() ? `"${query}"에 대한 결과가 없습니다.` : '검색할 내용을 입력하세요.'}</div>;
  }
  const t = text[view];
  if (!t) return null;
  return (
    <div className="empty">
      <strong>{t[0]}</strong>
      <span>{t[1]}</span>
    </div>
  );
}
