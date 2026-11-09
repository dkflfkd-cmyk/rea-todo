import { useState } from 'react';
import type { ViewId } from '../types';
import { THEMES, uid, useStore } from '../store';
import { SMART, inView } from '../views';
import { Icon } from '../icons';
import { todayStr } from '../date';

type Props = {
  view: ViewId;
  onSelect: (v: ViewId) => void;
  query: string;
  onQuery: (q: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  newListRef: React.RefObject<HTMLInputElement | null>;
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ view, onSelect, query, onQuery, searchRef, newListRef, collapsed, onToggle }: Props) {
  const { state, dispatch } = useStore();
  const [newName, setNewName] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);

  const count = (v: ViewId) => state.tasks.filter((t) => !t.done && inView(t, v)).length;
  const visible = SMART.filter((s) => {
    if (s.id === 'myday' || s.id === 'tasks') return true;
    return state.settings.smartLists[s.id as 'important' | 'planned' | 'all' | 'completed'];
  });

  function createList() {
    const id = uid();
    // the original names untitled lists "제목 없는 목록", "제목 없는 목록 (1)", ...
    let name = newName.trim();
    if (!name) {
      const base = '제목 없는 목록';
      const n = state.lists.filter((l) => l.name.startsWith(base)).length;
      name = n === 0 ? base : `${base} (${n})`;
    }
    dispatch({ type: 'addList', list: { id, name, theme: THEMES[state.lists.length % THEMES.length] } });
    setNewName('');
    onSelect(`list:${id}`);
  }

  // dropping a task on a list moves it there (or flags it for smart lists)
  function onDrop(e: React.DragEvent, target: ViewId) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/task');
    if (!id) return;
    if (target === 'myday') dispatch({ type: 'updateTask', id, patch: { myDay: todayStr() } });
    else if (target === 'important') dispatch({ type: 'updateTask', id, patch: { important: true } });
    else if (target === 'tasks') dispatch({ type: 'updateTask', id, patch: { listId: 'tasks' } });
    else if (target.startsWith('list:')) dispatch({ type: 'updateTask', id, patch: { listId: target.slice(5) } });
  }

  const item = (id: ViewId, name: string, icon: string, color: string) => (
    <li key={id}>
      <button
        className={`nav-item${view === id ? ' active' : ''}${dragOver === id ? ' drop' : ''}`}
        onClick={() => onSelect(id)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(id);
        }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => onDrop(e, id)}
        title={name}
      >
        <span className="nav-icon" style={{ color }}>
          <Icon name={icon} />
        </span>
        {!collapsed && <span className="nav-name">{name}</span>}
        {!collapsed && count(id) > 0 && <span className="nav-count">{count(id)}</span>}
      </button>
    </li>
  );

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-top">
        <button className="icon-btn" onClick={onToggle} aria-label="탐색 창 접기/펴기" title="탐색 창 접기/펴기">
          <Icon name="menu" />
        </button>
      </div>
      {!collapsed && (
        <div className="search-box">
          <Icon name="search" size={16} />
          <input
            ref={searchRef}
            value={query}
            placeholder="검색"
            onChange={(e) => {
              onQuery(e.target.value);
              if (e.target.value) onSelect('search');
            }}
            onFocus={() => query && onSelect('search')}
          />
          {query && (
            <button className="icon-btn small" onClick={() => onQuery('')} aria-label="검색 지우기">
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      )}
      <ul className="nav">{visible.map((s) => item(s.id, s.name, s.icon, s.color))}</ul>
      <div className="nav-divider" />
      <ul className="nav lists">{state.lists.map((l) => item(`list:${l.id}`, l.name, 'list', l.theme))}</ul>
      <div className="sidebar-bottom">
        {!collapsed && (
          <div className="new-list">
            <button className="icon-btn" onClick={createList} aria-label="새 목록">
              <Icon name="plus" />
            </button>
            <input
              ref={newListRef}
              value={newName}
              placeholder="새 목록"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createList()}
            />
          </div>
        )}
        <button
          className={`nav-item${view === 'settings' ? ' active' : ''}`}
          onClick={() => onSelect('settings')}
          title="설정"
        >
          <span className="nav-icon">
            <Icon name="settings" />
          </span>
          {!collapsed && <span className="nav-name">설정</span>}
        </button>
      </div>
    </aside>
  );
}
