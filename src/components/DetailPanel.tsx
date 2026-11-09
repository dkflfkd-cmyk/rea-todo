import { useState } from 'react';
import type { Repeat, Task } from '../types';
import { playDing, useStore } from '../store';
import { addDays, createdLabel, dueLabel, nextMonday, reminderLabel, toLocalInput, todayStr, REPEAT_LABEL } from '../date';
import { Icon } from '../icons';
import { Menu } from './Menu';
import type { MenuItem } from './Menu';

type Props = { task: Task; onClose: () => void; onDelete: () => void };

export function DetailPanel({ task, onClose, onDelete }: Props) {
  const { state, dispatch } = useStore();
  const [step, setStep] = useState('');
  const [menu, setMenu] = useState<{ kind: 'reminder' | 'due' | 'repeat'; x: number; y: number } | null>(null);
  const [picker, setPicker] = useState<'reminder' | 'due' | null>(null);
  const today = todayStr();
  const update = (patch: Partial<Task>) => dispatch({ type: 'updateTask', id: task.id, patch });

  function at(day: string, hour: number) {
    const d = new Date(`${day}T00:00`);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  function laterToday() {
    const d = new Date();
    d.setHours(d.getHours() + 3, 0, 0, 0);
    return d.toISOString();
  }

  const open = (kind: 'reminder' | 'due' | 'repeat') => (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ kind, x: r.left + 24, y: r.bottom + 4 });
  };

  const menus: Record<'reminder' | 'due' | 'repeat', MenuItem[]> = {
    reminder: [
      { label: '오늘 늦게', icon: 'bell', onClick: () => update({ reminder: laterToday() }) },
      { label: '내일 오전 9시', icon: 'bell', onClick: () => update({ reminder: at(addDays(today, 1), 9) }) },
      { label: '다음 주 월요일 오전 9시', icon: 'bell', onClick: () => update({ reminder: at(nextMonday(today), 9) }) },
      { divider: true },
      { label: '날짜 및 시간 선택', icon: 'calendar', onClick: () => setPicker('reminder') },
    ],
    due: [
      { label: '오늘', icon: 'calendar', onClick: () => update({ due: today }) },
      { label: '내일', icon: 'calendar', onClick: () => update({ due: addDays(today, 1) }) },
      { label: '다음 주', icon: 'calendar', onClick: () => update({ due: nextMonday(today) }) },
      { divider: true },
      { label: '날짜 선택', icon: 'calendar', onClick: () => setPicker('due') },
    ],
    repeat: (['daily', 'weekdays', 'weekly', 'monthly', 'yearly'] as Repeat[]).map((r) => ({
      label: REPEAT_LABEL[r],
      icon: 'repeat',
      checked: task.repeat === r,
      onClick: () => update({ repeat: r }),
    })),
  };

  function addStep() {
    const t = step.trim();
    if (!t) return;
    dispatch({ type: 'addStep', taskId: task.id, title: t });
    setStep('');
  }

  const due = task.due ? dueLabel(task.due) : null;

  return (
    <aside className="detail">
      <div className="detail-scroll">
        <div className="card">
          <div className="detail-title">
            <button
              className={`check${task.done ? ' on' : ''}`}
              onClick={() => {
                if (!task.done && state.settings.playSound) playDing();
                dispatch({ type: 'toggleDone', id: task.id });
              }}
              aria-label="완료됨으로 표시"
            >
              <Icon name="check" size={12} />
            </button>
            <textarea
              className={task.done ? 'done' : ''}
              value={task.title}
              rows={1}
              onChange={(e) => update({ title: e.target.value.replace(/\n/g, '') })}
              onBlur={(e) => !e.target.value.trim() && update({ title: '제목 없음' })}
            />
            <button className={`star${task.important ? ' on' : ''}`} onClick={() => update({ important: !task.important })} aria-label="중요로 표시">
              <Icon name="star" filled={task.important} />
            </button>
          </div>
          {task.steps.map((s) => (
            <div key={s.id} className="step">
              <button className={`check small${s.done ? ' on' : ''}`} onClick={() => dispatch({ type: 'updateStep', taskId: task.id, stepId: s.id, patch: { done: !s.done } })} aria-label="단계 완료">
                <Icon name="check" size={10} />
              </button>
              <input
                className={s.done ? 'done' : ''}
                value={s.title}
                onChange={(e) => dispatch({ type: 'updateStep', taskId: task.id, stepId: s.id, patch: { title: e.target.value } })}
              />
              <button className="icon-btn small" title="작업으로 승격" aria-label="작업으로 승격" onClick={() => dispatch({ type: 'promoteStep', taskId: task.id, stepId: s.id })}>
                <Icon name="arrowUp" size={14} />
              </button>
              <button className="icon-btn small" title="단계 삭제" aria-label="단계 삭제" onClick={() => dispatch({ type: 'deleteStep', taskId: task.id, stepId: s.id })}>
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          <div className="step add">
            <Icon name="plus" size={16} />
            <input value={step} placeholder={task.steps.length ? '다음 단계' : '단계 추가'} onChange={(e) => setStep(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStep()} />
          </div>
        </div>

        <div className="card">
          <Row
            icon="sun"
            active={task.myDay === today}
            label={task.myDay === today ? '오늘 할 일에 추가됨' : '오늘 할 일에 추가'}
            onClick={() => update({ myDay: task.myDay === today ? null : today })}
            onClear={task.myDay === today ? () => update({ myDay: null }) : undefined}
          />
        </div>

        <div className="card">
          <Row icon="bell" active={!!task.reminder} label={task.reminder ? reminderLabel(task.reminder) : '미리 알림'} onClick={open('reminder')} onClear={task.reminder ? () => update({ reminder: null }) : undefined} />
          {picker === 'reminder' && (
            <div className="picker">
              <input type="datetime-local" defaultValue={task.reminder ? toLocalInput(task.reminder) : `${today}T09:00`} id="rp" />
              <button
                className="primary"
                onClick={() => {
                  const v = (document.getElementById('rp') as HTMLInputElement).value;
                  if (v) update({ reminder: new Date(v).toISOString() });
                  setPicker(null);
                }}
              >
                저장
              </button>
            </div>
          )}
          <Row
            icon="calendar"
            active={!!task.due}
            danger={!!due?.overdue && !task.done}
            label={due ? `기한: ${due.text}` : '기한 추가'}
            onClick={open('due')}
            onClear={task.due ? () => update({ due: null, repeat: 'none' }) : undefined}
          />
          {picker === 'due' && (
            <div className="picker">
              <input type="date" defaultValue={task.due ?? today} id="dp" />
              <button
                className="primary"
                onClick={() => {
                  const v = (document.getElementById('dp') as HTMLInputElement).value;
                  if (v) update({ due: v });
                  setPicker(null);
                }}
              >
                저장
              </button>
            </div>
          )}
          <Row icon="repeat" active={task.repeat !== 'none'} label={task.repeat !== 'none' ? REPEAT_LABEL[task.repeat] : '반복'} onClick={open('repeat')} onClear={task.repeat !== 'none' ? () => update({ repeat: 'none' }) : undefined} />
        </div>

        <div className="card">
          <textarea className="note" value={task.note} placeholder="메모 추가" rows={5} onChange={(e) => update({ note: e.target.value })} />
        </div>
      </div>

      <footer className="detail-foot">
        <button className="icon-btn" onClick={onClose} aria-label="세부 정보 보기 숨기기" title="세부 정보 보기 숨기기">
          <Icon name="chevronRight" />
        </button>
        <span>{task.done && task.completedAt ? `${new Date(task.completedAt).toLocaleDateString('ko-KR')}에 완료됨` : createdLabel(task.createdAt)}</span>
        <button className="icon-btn" onClick={onDelete} aria-label="작업 삭제" title="작업 삭제">
          <Icon name="trash" />
        </button>
      </footer>
      {menu && <Menu x={menu.x} y={menu.y} items={menus[menu.kind]} onClose={() => setMenu(null)} />}
    </aside>
  );
}

function Row(props: { icon: string; label: string; active: boolean; danger?: boolean; onClick: (e: React.MouseEvent) => void; onClear?: () => void }) {
  return (
    <div className={`row${props.active ? ' active' : ''}${props.danger ? ' danger' : ''}`}>
      <button className="row-main" onClick={props.onClick}>
        <Icon name={props.icon} />
        <span>{props.label}</span>
      </button>
      {props.onClear && (
        <button className="icon-btn small" onClick={props.onClear} aria-label="제거">
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}
