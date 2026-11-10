import { useState } from 'react';
import type { SmartListKey, TodoList, ViewId } from '../types';
import { THEMES, uid, useStore } from '../store';
import { SMART, inView } from '../views';
import { Icon } from '../icons';
import { todayStr } from '../date';
import { Menu } from './Menu';
import type { MenuItem } from './Menu';

type Props = {
  view: ViewId;
  onSelect: (v: ViewId) => void;
  newListRef: React.RefObject<HTMLInputElement | null>;
  collapsed: boolean;
  onToggle: () => void;
  onUnsupported: (message: string) => void;
};

export function Sidebar({ view, onSelect, newListRef, collapsed, onToggle, onUnsupported }: Props) {
  const { state, dispatch } = useStore();
  const [newName, setNewName] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);

  const count = (v: ViewId) => state.tasks.filter((t) => !t.done && inView(t, v)).length;
  const visible = SMART.filter((s) => {
    if (s.id === 'myday' || s.id === 'tasks') return true;
    return state.settings.smartLists[s.id as SmartListKey];
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
    dispatch({ type: 'addList', list: { id, name, theme: THEMES[state.lists.length % THEMES.length], groupId: null } });
    setNewName('');
    onSelect(`list:${id}`);
  }

  function createGroup() {
    const id = uid();
    const base = '제목 없는 그룹';
    const n = state.groups.filter((g) => g.name.startsWith(base)).length;
    dispatch({ type: 'addGroup', group: { id, name: n === 0 ? base : `${base} (${n})`, collapsed: false } });
    setRenamingGroup(id);
  }

  // dropping a task on a list moves it there (or flags it for smart lists); dropping a list on a group files it
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

  function listMenu(e: React.MouseEvent, l: TodoList) {
    e.preventDefault();
    const items: MenuItem[] = [
      ...state.groups.map((g) => ({
        label: `그룹으로 이동: ${g.name}`,
        icon: 'folder',
        checked: l.groupId === g.id,
        onClick: () => dispatch({ type: 'updateList', id: l.id, patch: { groupId: g.id } }),
      })),
      ...(l.groupId ? [{ label: '그룹에서 제거', icon: 'x', onClick: () => dispatch({ type: 'updateList', id: l.id, patch: { groupId: null } }) }] : []),
    ];
    if (items.length) setMenu({ x: e.clientX, y: e.clientY, items });
  }

  const item = (id: ViewId, name: string, icon: string, color: string, list?: TodoList) => (
    <li key={id}>
      <button
        className={`nav-item${view === id ? ' active' : ''}${dragOver === id ? ' drop' : ''}${list?.groupId ? ' in-group' : ''}`}
        onClick={() => onSelect(id)}
        onContextMenu={list ? (e) => listMenu(e, list) : undefined}
        draggable={!!list}
        onDragStart={list ? (e) => e.dataTransfer.setData('text/list', list.id) : undefined}
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

  const listItem = (l: TodoList) => item(`list:${l.id}`, l.name, 'list', l.theme, l);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-top">
        <button className="icon-btn" onClick={onToggle} aria-label="탐색 창 접기/펴기" title="탐색 창 접기/펴기">
          <Icon name="menu" />
        </button>
      </div>
      <ul className="nav">{visible.map((s) => item(s.id, s.name, s.icon, s.color))}</ul>
      <div className="nav-divider" />
      <ul className="nav lists">
        {state.lists.filter((l) => !l.groupId || !state.groups.some((g) => g.id === l.groupId)).map(listItem)}
        {state.groups.map((g) => (
          <li key={g.id}>
            <div
              className={`group-row${dragOver === `group:${g.id}` ? ' drop' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(`group:${g.id}`);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const listId = e.dataTransfer.getData('text/list');
                if (listId) dispatch({ type: 'updateList', id: listId, patch: { groupId: g.id } });
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    { label: '그룹 이름 바꾸기', icon: 'edit', onClick: () => setRenamingGroup(g.id) },
                    { label: '그룹 해제', icon: 'x', danger: true, onClick: () => dispatch({ type: 'deleteGroup', id: g.id }) },
                  ],
                });
              }}
            >
              <button
                className="group-toggle"
                onClick={() => dispatch({ type: 'updateGroup', id: g.id, patch: { collapsed: !g.collapsed } })}
                aria-label={g.collapsed ? '그룹 펼치기' : '그룹 접기'}
              >
                <Icon name="folder" />
              </button>
              {!collapsed &&
                (renamingGroup === g.id ? (
                  <input
                    className="group-input"
                    autoFocus
                    defaultValue={g.name}
                    onFocus={(e) => e.target.select()}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v) dispatch({ type: 'updateGroup', id: g.id, patch: { name: v } });
                      setRenamingGroup(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                ) : (
                  <span className="nav-name" onDoubleClick={() => setRenamingGroup(g.id)}>
                    {g.name}
                  </span>
                ))}
              {!collapsed && (
                <span className="group-chevron">
                  <Icon name={g.collapsed ? 'chevronRight' : 'chevronDown'} size={16} />
                </span>
              )}
            </div>
            {!g.collapsed && (
              <ul className="nav">
                {state.lists.filter((l) => l.groupId === g.id).map(listItem)}
                {!collapsed && state.lists.every((l) => l.groupId !== g.id) && <li className="group-empty">목록을 여기로 끌어 오세요</li>}
              </ul>
            )}
          </li>
        ))}
      </ul>
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
            <button className="icon-btn" onClick={createGroup} aria-label="그룹 만들기" title="그룹 만들기">
              <Icon name="groupAdd" />
            </button>
          </div>
        )}
        {!collapsed && (
          <nav className="app-switcher" aria-label="앱 전환">
            {[
              ['mail', '메일'],
              ['calendar', '일정'],
              ['people', '사람'],
              ['clip', '파일'],
            ].map(([icon, label]) => (
              <button key={icon} title={label} aria-label={label} onClick={() => onUnsupported(`${label}은(는) 다른 Microsoft 서비스로 이동하는 기능이라 지원하지 않습니다.`)}>
                <Icon name={icon} />
              </button>
            ))}
            <button className="on" title="To Do" aria-label="To Do" aria-current="page">
              <Icon name="check" />
            </button>
          </nav>
        )}
      </div>
      {menu && <Menu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </aside>
  );
}
