import type { Step, Task, TodoList } from './types';
import { addDays, todayStr } from './date';
import { uid } from './store';

// everyday sample data for demos; dates are relative to today
export function sampleData(): { tasks: Task[]; lists: TodoList[] } {
  const today = todayStr();
  const now = Date.now();
  let order = 0;
  const steps = (...titles: [string, boolean][]): Step[] => titles.map(([title, done]) => ({ id: uid(), title, done }));
  const reminder = new Date();
  reminder.setHours(reminder.getHours() + 2, 0, 0, 0);

  const mk = (title: string, extra: Partial<Task> = {}): Task => ({
    id: uid(),
    title,
    listId: 'tasks',
    done: false,
    important: false,
    myDay: null,
    due: null,
    reminder: null,
    reminderFired: false,
    repeat: 'none',
    steps: [],
    note: '',
    order: order++,
    createdAt: now - 2 * 86400000,
    completedAt: null,
    ...extra,
  });

  const lists: TodoList[] = [
    { id: uid(), name: '장보기', theme: '#e46c8c' },
    { id: uid(), name: '운동', theme: '#4aa079' },
    { id: uid(), name: '여행 준비', theme: '#788cde' },
  ];
  const [shop, gym, trip] = lists.map((l) => l.id);

  const tasks: Task[] = [
    mk('주말 대청소', {
      myDay: today,
      important: true,
      due: today,
      steps: steps(['이불 빨래', true], ['화장실 청소', true], ['분리수거', false]),
      note: '세제 다 떨어졌으면 장보기 목록에 추가',
    }),
    mk('엄마한테 전화하기', { myDay: today, reminder: reminder.toISOString() }),
    mk('마트 장보기', { listId: shop, myDay: today, due: today }),
    mk('헬스장 가기', { listId: gym, myDay: today, due: addDays(today, 1), repeat: 'weekly' }),
    mk('택배 반품 보내기', { due: addDays(today, -1) }),
    mk('친구 생일 선물 사기', { important: true, due: addDays(today, 3) }),
    mk('관리비 납부', { done: true, completedAt: now }),
    mk('우유', { listId: shop }),
    mk('계란 한 판', { listId: shop, important: true }),
    mk('사과', { listId: shop }),
    mk('스트레칭 10분', { listId: gym, myDay: addDays(today, -1), repeat: 'daily', due: today }),
    mk('숙소 예약', { listId: trip, important: true, due: addDays(today, 9) }),
    mk('기차표 예매', { listId: trip, steps: steps(['가는 표', false], ['오는 표', false]) }),
    mk('도서관 책 반납', { due: addDays(today, 6) }),
  ];
  return { tasks, lists };
}
