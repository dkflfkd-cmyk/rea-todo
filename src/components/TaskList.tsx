import { useState } from 'react';
import type { GroupBy, Repeat, SortKey, Task, ViewId } from '../types';
import { THEMES, THEME_NAMES, defaultPref, listName, uid, useStore } from '../store';
import type { AddExtras } from '../store';
import { inView, plannedGroup, PLANNED_ORDER, sortTasks, SORT_LABEL, viewMeta } from '../views';
import { addDays, dueLabel, longDate, nextMonday, reminderLabel, todayStr, REPEAT_LABEL } from '../date';
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

type MenuKind = 'sort' | 'more' | 'group' | 'addDue' | 'addReminder' | 'addRepeat';

const GROUP_LABEL: Record<GroupBy, string> = { none: '그룹 없음', due: '기한', importance: '중요도', list: '목록' };

export function TaskList({ view, query, selectedId, onSelectTask, onDeleteTask, onDeleteList, addRef }: Props) {
  const { state, dispatch } = useStore();
  const [title, setTitle] = useState('');
  const [extras, setExtras] = useState<AddExtras>({});
  const [focused, setFocused] = useState(false);
  const [menu, setMenu] = useState<{ kind: MenuKind; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(true);

  const meta = viewMeta(state, view);
  const pref = { ...defaultPref(view), ...state.viewPrefs[view] };
  const listId = view.startsWith('list:') ? view.slice(5) : null;
  const all = state.tasks.filter((t) => inView(t, view, query));
  const open = sortTasks(all.filter((t) => !t.done), pref.sort, pref.asc);
  const done = sortTasks(all.filter((t) => t.done), pref.sort === 'manual' ? 'created' : pref.sort, pref.asc);
  const canAdd = view !== 'search' && view !== 'completed';
  const canDrag = pref.sort === 'manual' && pref.groupBy === 'none' && view !== 'search';
  const grid = pref.layout === 'grid';
  const today = todayStr();

  function add() {
    const t = title.trim();
    if (!t) return;
    dispatch({ type: 'addTask', id: uid(), title: t, view, extras });
    setTitle('');
    setExtras({});
  }

  const setPref = (patch: Partial<typeof pref>) => dispatch({ type: 'setViewPref', view, patch });
  const setSort = (sort: SortKey) => setPref({ sort, asc: true });
  const openMenu = (kind: MenuKind) => (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ kind, x: r.left, y: r.bottom + 4 });
  };

  const at = (day: string, hour: number) => {
    const d = new Date(`${day}T00:00`);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const menus: Record<MenuKind, MenuItem[]> = {
    sort: (['importance', 'due', 'title', 'created'] as SortKey[])
      .filter((k) => !(view === 'important' && k === 'importance') && !(view === 'planned' && k === 'due'))
      .map((k) => ({ label: SORT_LABEL[k], icon: 'sort', checked: pref.sort === k, onClick: () => setSort(k) })),
    group: (['none', 'due', 'importance', 'list'] as GroupBy[])
      .filter((g) => !(listId && g === 'list'))
      .map((g) => ({ label: GROUP_LABEL[g], icon: 'folder', checked: pref.groupBy === g, onClick: () => setPref({ groupBy: g }) })),
    more: [
      ...(listId ? [{ label: '목록 이름 바꾸기', icon: 'edit', onClick: () => setRenaming(true) }] : []),
      ...(listId
        ? THEMES.map((c, i) => ({
            label: `테마: ${THEME_NAMES[i]}`,
            icon: 'palette',
            checked: meta.color === c,
            onClick: () => dispatch({ type: 'updateList', id: listId, patch: { theme: c } }),
          }))
        : []),
      { label: pref.showCompleted ? '완료된 작업 숨기기' : '완료된 작업 표시', icon: 'eye', onClick: () => setPref({ showCompleted: !pref.showCompleted }) },
      { label: '목록 인쇄', icon: 'print', onClick: () => window.print() },
      ...(listId ? [{ divider: true as const }, { label: '목록 삭제', icon: 'trash', danger: true, onClick: () => onDeleteList(listId) }] : []),
    ],
    addDue: [
      { label: '오늘', icon: 'calendar', onClick: () => setExtras({ ...extras, due: today }) },
      { label: '내일', icon: 'calendar', onClick: () => setExtras({ ...extras, due: addDays(today, 1) }) },
      { label: '다음 주', icon: 'calendar', onClick: () => setExtras({ ...extras, due: nextMonday(today) }) },
      ...(extras.due ? [{ divider: true as const }, { label: '기한 제거', icon: 'x', danger: true, onClick: () => setExtras({ ...extras, due: undefined }) }] : []),
    ],
    addReminder: [
      {
        label: '오늘 늦게',
        icon: 'bell',
        onClick: () => {
          const d = new Date();
          d.setHours(d.getHours() + 3, 0, 0, 0);
          setExtras({ ...extras, reminder: d.toISOString() });
        },
      },
      { label: '내일 오전 9시', icon: 'bell', onClick: () => setExtras({ ...extras, reminder: at(addDays(today, 1), 9) }) },
      { label: '다음 주 월요일 오전 9시', icon: 'bell', onClick: () => setExtras({ ...extras, reminder: at(nextMonday(today), 9) }) },
      ...(extras.reminder ? [{ divider: true as const }, { label: '미리 알림 제거', icon: 'x', danger: true, onClick: () => setExtras({ ...extras, reminder: undefined }) }] : []),
    ],
    addRepeat: [
      ...(['daily', 'weekdays', 'weekly', 'monthly', 'yearly'] as Repeat[]).map((r) => ({
        label: REPEAT_LABEL[r],
        icon: 'repeat',
        checked: extras.repeat === r,
        onClick: () => setExtras({ ...extras, repeat: r }),
      })),
      ...(extras.repeat && extras.repeat !== 'none' ? [{ divider: true as const }, { label: '반복 안 함', icon: 'x', danger: true, onClick: () => setExtras({ ...extras, repeat: undefined }) }] : []),
    ],
  };

  const renderTask = (t: Task) => (
    <TaskItem
      key={t.id}
      task={t}
      view={view}
      layout={pref.layout}
      selected={selectedId === t.id}
      onSelect={() => onSelectTask(t.id)}
      onDelete={() => onDeleteTask(t.id)}
      draggable={canDrag && !t.done}
      onDropBefore={(dragId) => dispatch({ type: 'reorder', id: dragId, beforeId: t.id })}
    />
  );

  // group the open tasks: the Planned view always groups by due date
  function groups(tasks: Task[]): { key: string; items: Task[] }[] {
    const by = view === 'planned' ? 'planned' : pref.groupBy;
    if (by === 'none') return [{ key: '', items: tasks }];
    if (by === 'planned') {
      return PLANNED_ORDER.map((g) => ({ key: g, items: tasks.filter((t) => plannedGroup(t.due!) === g) })).filter((x) => x.items.length);
    }
    const keyOf = (t: Task) =>
      by === 'importance' ? (t.important ? '중요' : '보통') : by === 'list' ? listName(state, t.listId) : t.due ? plannedGroup(t.due) : '기한 없음';
    const order = by === 'due' ? [...PLANNED_ORDER, '기한 없음'] : by === 'importance' ? ['중요', '보통'] : [...new Set(tasks.map(keyOf))];
    return order.map((k) => ({ key: k, items: tasks.filter((t) => keyOf(t) === k) })).filter((x) => x.items.length);
  }

  const body =
    view === 'completed' ? (
      done.map(renderTask)
    ) : (
      <>
        {groups(open).map(({ key, items }) =>
          key ? (
            <Group key={key} title={key} count={items.length}>
              {items.map(renderTask)}
            </Group>
          ) : (
            items.map(renderTask)
          ),
        )}
        {pref.showCompleted && done.length > 0 && view !== 'important' && view !== 'planned' && (
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

  const chips: string[] = [];
  if (extras.due) chips.push(dueLabel(extras.due).text);
  if (extras.reminder) chips.push(reminderLabel(extras.reminder));
  if (extras.repeat && extras.repeat !== 'none') chips.push(REPEAT_LABEL[extras.repeat]);

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
            <>
              <button className="icon-btn" aria-label="목록 옵션" title="목록 옵션" onClick={openMenu('more')}>
                <Icon name="more" />
              </button>
              <div className="layout-tabs" role="tablist">
                <button role="tab" aria-selected={grid} className={grid ? 'on' : ''} onClick={() => setPref({ layout: 'grid' })}>
                  <Icon name="grid" size={16} /> <span className="btn-label">그리드</span>
                </button>
                <button role="tab" aria-selected={!grid} className={!grid ? 'on' : ''} onClick={() => setPref({ layout: 'list' })}>
                  <Icon name="rows" size={16} /> <span className="btn-label">목록</span>
                </button>
              </div>
            </>
          )}
          <div className="spacer" />
          {view !== 'search' && view !== 'planned' && (
            <button className="text-btn" onClick={openMenu('sort')}>
              <Icon name="sort" size={16} /> <span className="btn-label">정렬</span>
            </button>
          )}
          {view !== 'search' && view !== 'planned' && view !== 'completed' && (
            <button className="text-btn" onClick={openMenu('group')}>
              <Icon name="folder" size={16} /> <span className="btn-label">그룹</span>
            </button>
          )}
          {view === 'myday' && (
            <button className={`text-btn${showSuggest ? ' pressed' : ''}`} onClick={() => setShowSuggest(!showSuggest)}>
              <Icon name="bulb" size={16} /> <span className="btn-label">일정 계획</span>
            </button>
          )}
        </div>
        {view === 'myday' && <div className="subtitle">{longDate(today)}</div>}
        {(pref.sort !== 'manual' || pref.groupBy !== 'none') && view !== 'search' && (
          <div className="chip-row">
            {pref.sort !== 'manual' && (
              <div className="sort-chip">
                <button onClick={() => setPref({ asc: !pref.asc })} aria-label="정렬 순서 바꾸기">
                  <Icon name={pref.asc ? 'arrowUp' : 'arrowDown'} size={14} />
                </button>
                {SORT_LABEL[pref.sort]} 순으로 정렬됨
                <button onClick={() => setSort('manual')} aria-label="정렬 제거">
                  <Icon name="x" size={14} />
                </button>
              </div>
            )}
            {pref.groupBy !== 'none' && (
              <div className="sort-chip">
                {GROUP_LABEL[pref.groupBy]}별로 그룹화됨
                <button onClick={() => setPref({ groupBy: 'none' })} aria-label="그룹 제거">
                  <Icon name="x" size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="main-body">
        {canAdd && (
          <div className={`add-card${focused || title ? ' focused' : ''}`}>
            <div className="add-bar">
              {focused || title ? <span className="add-circle" /> : <Icon name="plus" />}
              <input
                ref={addRef}
                value={title}
                placeholder="작업 추가"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
            </div>
            <div className="add-tools">
              <button className={`icon-btn${extras.due ? ' on' : ''}`} onClick={openMenu('addDue')} aria-label="기한 추가" title="기한 추가">
                <Icon name="calendar" />
              </button>
              <button className={`icon-btn${extras.reminder ? ' on' : ''}`} onClick={openMenu('addReminder')} aria-label="미리 알림" title="미리 알림">
                <Icon name="bell" />
              </button>
              <button className={`icon-btn${extras.repeat && extras.repeat !== 'none' ? ' on' : ''}`} onClick={openMenu('addRepeat')} aria-label="반복" title="반복">
                <Icon name="repeat" />
              </button>
              {chips.length > 0 && <span className="add-chips">{chips.join(' · ')}</span>}
              <div className="spacer" />
              {title.trim() && (
                <button className="text-btn outline" onMouseDown={(e) => e.preventDefault()} onClick={add}>
                  추가
                </button>
              )}
            </div>
          </div>
        )}
        <div className={`tasks${grid ? ' grid' : ''}`}>
          {grid && all.length > 0 && (
            <div className="grid-head">
              <span />
              <span>제목</span>
              <span>기한</span>
              <span>중요도</span>
            </div>
          )}
          {body}
        </div>
        {all.length === 0 && <EmptyState view={view} query={query} />}
      </div>

      {showSuggest && view === 'myday' && <Suggestions onClose={() => setShowSuggest(false)} />}
      {menu && <Menu x={menu.x} y={menu.y} items={menus[menu.kind]} onClose={() => setMenu(null)} />}
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
