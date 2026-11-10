import { useState } from 'react';
import type { Task, ViewId } from '../types';
import { listName, playDing, useStore } from '../store';
import { addDays, dueLabel, nextMonday, reminderLabel, todayStr, REPEAT_LABEL } from '../date';
import { Icon } from '../icons';
import { Menu } from './Menu';
import type { MenuItem } from './Menu';

type Props = {
  task: Task;
  view: ViewId;
  layout: 'list' | 'grid';
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  draggable: boolean;
  onDropBefore: (dragId: string) => void;
};

export function TaskItem({ task, view, layout, selected, onSelect, onDelete, draggable, onDropBefore }: Props) {
  const { state, dispatch } = useStore();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const today = todayStr();
  const update = (patch: Partial<Task>) => dispatch({ type: 'updateTask', id: task.id, patch });

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!task.done && state.settings.playSound) playDing();
    dispatch({ type: 'toggleDone', id: task.id });
  }

  const meta: React.ReactNode[] = [];
  if (task.myDay === today && view !== 'myday') meta.push(<span key="md"><Icon name="sun" size={12} /> 오늘 할 일</span>);
  if (view !== `list:${task.listId}` && !(view === 'tasks' && task.listId === 'tasks')) meta.push(<span key="l">{listName(state, task.listId)}</span>);
  if (task.steps.length > 0) meta.push(<span key="s">{task.steps.filter((s) => s.done).length}/{task.steps.length}</span>);
  if (task.due) {
    const d = dueLabel(task.due);
    meta.push(
      <span key="d" className={d.overdue && !task.done ? 'overdue' : d.today ? 'today' : ''}>
        <Icon name="calendar" size={12} /> {d.overdue && !task.done ? `기한 지남, ${d.text}` : d.text}
        {task.repeat !== 'none' && <> <Icon name="repeat" size={12} /></>}
      </span>,
    );
  }
  if (task.reminder) meta.push(<span key="r"><Icon name="bell" size={12} /> {reminderLabel(task.reminder)}</span>);
  if (task.note.trim()) meta.push(<span key="n"><Icon name="note" size={12} /> 메모</span>);

  const moveTargets: MenuItem[] = [
    { label: '작업', icon: 'home', onClick: () => update({ listId: 'tasks' }) },
    ...state.lists.map((l) => ({ label: l.name, icon: 'list', onClick: () => update({ listId: l.id }) })),
  ];

  const items: MenuItem[] = [
    task.myDay === today
      ? { label: '오늘 할 일에서 제거', icon: 'sun', onClick: () => update({ myDay: null }) }
      : { label: '오늘 할 일에 추가', icon: 'sun', onClick: () => update({ myDay: today }) },
    { label: task.important ? '중요도 제거' : '중요로 표시', icon: 'star', onClick: () => update({ important: !task.important }) },
    { label: task.done ? '완료되지 않음으로 표시' : '완료됨으로 표시', icon: 'checkCircle', onClick: () => dispatch({ type: 'toggleDone', id: task.id }) },
    { divider: true },
    { label: '오늘까지', icon: 'calendar', onClick: () => update({ due: today }) },
    { label: '내일까지', icon: 'calendar', onClick: () => update({ due: addDays(today, 1) }) },
    { label: '다음 주까지', icon: 'calendar', onClick: () => update({ due: nextMonday(today) }) },
    ...(task.due ? [{ label: '기한 제거', icon: 'x', onClick: () => update({ due: null, repeat: 'none' as const }) }] : []),
    { divider: true },
    ...moveTargets.map((m) => ('label' in m ? { ...m, label: `다음으로 이동: ${m.label}`, icon: 'move' } : m)),
    { divider: true },
    { label: '작업 삭제', icon: 'trash', danger: true, onClick: onDelete },
  ];

  return (
    <>
      <div
        className={`task${layout === 'grid' ? ' grid-row' : ''}${selected ? ' selected' : ''}${task.done ? ' done' : ''}${over ? ' drop-before' : ''}`}
        onClick={onSelect}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/task', task.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (!draggable) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false);
          const id = e.dataTransfer.getData('text/task');
          if (draggable && id) {
            e.preventDefault();
            e.stopPropagation();
            onDropBefore(id);
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
        title={task.repeat !== 'none' ? `${REPEAT_LABEL[task.repeat]} 반복` : undefined}
      >
        <button className={`check${task.done ? ' on' : ''}`} onClick={toggle} aria-label={task.done ? '완료되지 않음으로 표시' : '완료됨으로 표시'}>
          <Icon name="check" size={12} />
        </button>
        <div className="task-body">
          <div className="task-title">{task.title}</div>
          {layout === 'list' && meta.length > 0 && <div className="task-meta">{meta.map((m, i) => <span key={i} className="meta-part">{m}</span>)}</div>}
        </div>
        {layout === 'grid' && (
          <span className={`grid-due${task.due && dueLabel(task.due).overdue && !task.done ? ' overdue' : ''}`}>
            {task.due ? dueLabel(task.due).text : ''}
          </span>
        )}
        <button
          className={`star${task.important ? ' on' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            update({ important: !task.important });
          }}
          aria-label={task.important ? '중요도 제거' : '작업을 중요로 표시'}
        >
          <Icon name="star" filled={task.important} />
        </button>
      </div>
      {menu && <Menu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />}
    </>
  );
}
