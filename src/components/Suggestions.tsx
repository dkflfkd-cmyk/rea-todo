import type { Task } from '../types';
import { listName, useStore } from '../store';
import { dueLabel, todayStr } from '../date';
import { Icon } from '../icons';

// "일정 계획" pane of My Day: overdue / due-today tasks, and tasks left over from an earlier My Day
export function Suggestions({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const today = todayStr();
  const candidates = state.tasks.filter((t) => !t.done && t.myDay !== today);
  const sections: [string, Task[]][] = [
    ['오늘 또는 지난 기한', candidates.filter((t) => t.due && t.due <= today)],
    ['이전 오늘 할 일', candidates.filter((t) => t.myDay && t.myDay < today && !(t.due && t.due <= today))],
    ['나중에 할 일', candidates.filter((t) => t.due && t.due > today).slice(0, 5)],
  ];
  const any = sections.some(([, items]) => items.length);

  return (
    <aside className="suggest">
      <div className="suggest-head">
        <strong>일정 계획</strong>
        <button className="icon-btn" onClick={onClose} aria-label="일정 계획 닫기">
          <Icon name="x" />
        </button>
      </div>
      {!any && <div className="empty small">제안할 작업이 없습니다. 기한이 있는 작업을 만들어 보세요.</div>}
      {sections.map(([title, items]) =>
        items.length ? (
          <div key={title} className="suggest-sec">
            <div className="suggest-title">{title}</div>
            {items.map((t) => (
              <div key={t.id} className="suggest-item">
                <div className="task-body">
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    <span className="meta-part">{listName(state, t.listId)}</span>
                    {t.due && <span className={`meta-part${t.due < today ? ' overdue' : ''}`}>{dueLabel(t.due).text}</span>}
                  </div>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => dispatch({ type: 'updateTask', id: t.id, patch: { myDay: today } })}
                  aria-label="오늘 할 일에 추가"
                  title="오늘 할 일에 추가"
                >
                  <Icon name="plus" />
                </button>
              </div>
            ))}
          </div>
        ) : null,
      )}
    </aside>
  );
}
