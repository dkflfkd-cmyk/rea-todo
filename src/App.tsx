import { useEffect, useRef, useState } from 'react';
import type { ViewId } from './types';
import { StoreProvider, useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { DetailPanel } from './components/DetailPanel';
import { SettingsView } from './components/SettingsView';
import { reminderLabel, todayStr } from './date';
import { Icon } from './icons';
import './App.css';

type Confirm = { title: string; body: string; action: () => void };

function Shell() {
  const { state, dispatch } = useStore();
  const [view, setView] = useState<ViewId>('myday');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(window.innerWidth < 720);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const newListRef = useRef<HTMLInputElement>(null);

  const selected = state.tasks.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    const dark =
      state.settings.theme === 'dark' ||
      (state.settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [state.settings.theme]);

  // reminders are checked every 15 seconds while the app is open
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      for (const t of state.tasks) {
        if (t.reminder && !t.reminderFired && !t.done && new Date(t.reminder).getTime() <= now) {
          dispatch({ type: 'updateTask', id: t.id, patch: { reminderFired: true } });
          setToast(`미리 알림: ${t.title}`);
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('REA To Do 미리 알림', { body: `${t.title}\n${reminderLabel(t.reminder)}` });
            }
          } catch {
            // notifications unavailable
          }
        }
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [state.tasks, dispatch]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  function deleteTask(id: string) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    const run = () => {
      dispatch({ type: 'deleteTask', id });
      if (selectedId === id) setSelectedId(null);
    };
    if (state.settings.confirmDelete) setConfirm({ title: `"${t.title}"이(가) 영구적으로 삭제됩니다.`, body: '이 작업은 취소할 수 없습니다.', action: run });
    else run();
  }

  function deleteList(id: string) {
    const l = state.lists.find((x) => x.id === id);
    if (!l) return;
    setConfirm({
      title: `"${l.name}"이(가) 영구적으로 삭제됩니다.`,
      body: '이 목록과 목록의 모든 작업을 되돌릴 수 없습니다.',
      action: () => {
        dispatch({ type: 'deleteList', id });
        setView('tasks');
      },
    });
  }

  // keyboard shortcuts modelled on the Windows app
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea');
      const k = e.key.toLowerCase();
      if (e.ctrlKey && k === 'n') {
        e.preventDefault();
        addRef.current?.focus();
      } else if (e.ctrlKey && k === 'l') {
        e.preventDefault();
        setCollapsed(false);
        setTimeout(() => newListRef.current?.focus(), 0);
      } else if (e.ctrlKey && k === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.ctrlKey && k === 'd' && selectedId) {
        e.preventDefault();
        dispatch({ type: 'toggleDone', id: selectedId });
      } else if (e.ctrlKey && k === 't' && selected) {
        e.preventDefault();
        dispatch({ type: 'updateTask', id: selected.id, patch: { myDay: selected.myDay === todayStr() ? null : todayStr() } });
      } else if (e.key === 'Delete' && selectedId && !typing) {
        deleteTask(selectedId);
      } else if (e.key === 'Escape' && !typing) {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function selectView(v: ViewId) {
    setView(v);
    setSelectedId(null);
    if (v !== 'search') setQuery('');
    if (window.innerWidth < 720) setCollapsed(true);
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar-icon" aria-hidden="true">
          <Icon name="waffle" />
        </span>
        <span className="topbar-title">REA To Do</span>
        <div className="topbar-search">
          <Icon name="search" size={16} />
          <input
            ref={searchRef}
            value={query}
            aria-label="검색"
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) {
                setView('search');
                setSelectedId(null);
              } else if (view === 'search') setView('myday');
            }}
            onFocus={() => query && setView('search')}
          />
          {query && (
            <button
              className="icon-btn small"
              onClick={() => {
                setQuery('');
                if (view === 'search') setView('myday');
              }}
              aria-label="검색 지우기"
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
        <div className="spacer" />
        <button className="topbar-btn" onClick={() => selectView('settings')} aria-label="설정" title="설정">
          <Icon name="settings" />
        </button>
        <button className="topbar-btn" onClick={() => setHelp(true)} aria-label="도움말" title="도움말">
          <Icon name="help" />
        </button>
        <span className="topbar-avatar" aria-hidden="true">
          <Icon name="person" />
        </span>
      </header>
      <div className="app-body">
      <Sidebar view={view} onSelect={selectView} newListRef={newListRef} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} onUnsupported={setToast} />
      {view === 'settings' ? (
        <SettingsView />
      ) : (
        <TaskList
          view={view}
          query={query}
          selectedId={selectedId}
          onSelectTask={(id) => setSelectedId(id === selectedId ? null : id)}
          onDeleteTask={deleteTask}
          onDeleteList={deleteList}
          addRef={addRef}
        />
      )}
      {selected && view !== 'settings' && (
        <DetailPanel key={selected.id} task={selected} onClose={() => setSelectedId(null)} onDelete={() => deleteTask(selected.id)} />
      )}
      </div>

      {help && (
        <div className="overlay" onMouseDown={() => setHelp(false)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-label="바로 가기 키" onMouseDown={(e) => e.stopPropagation()}>
            <strong>바로 가기 키</strong>
            <table className="keys">
              <tbody>
                {[
                  ['Ctrl + N', '작업 추가'],
                  ['Ctrl + L', '새 목록'],
                  ['Ctrl + F', '검색'],
                  ['Ctrl + D', '선택한 작업 완료'],
                  ['Ctrl + T', '오늘 할 일에 추가/제거'],
                  ['Delete', '선택한 작업 삭제'],
                  ['Esc', '세부 정보 닫기'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td>
                      <kbd>{k}</kbd>
                    </td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="dialog-actions">
              <button className="text-btn outline" onClick={() => setHelp(false)} autoFocus>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="overlay" onMouseDown={() => setConfirm(null)}>
          <div className="dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <strong>{confirm.title}</strong>
            <p>{confirm.body}</p>
            <div className="dialog-actions">
              <button className="text-btn outline" onClick={() => setConfirm(null)} autoFocus>
                취소
              </button>
              <button
                className="danger-btn"
                onClick={() => {
                  confirm.action();
                  setConfirm(null);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
