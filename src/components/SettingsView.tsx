import type { Settings, SmartListKey } from '../types';
import { useStore } from '../store';
import { sampleData } from '../sample';

const SMART_LABEL: Record<SmartListKey, string> = { important: '중요', planned: '계획된 일정', assigned: '나에게 할당됨', all: '모두', completed: '완료됨' };

export function SettingsView() {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const set = (patch: Partial<Settings>) => dispatch({ type: 'setSettings', patch });

  return (
    <section className="main settings">
      <header className="main-head">
        <div className="title-row">
          <h1>설정</h1>
        </div>
      </header>
      <div className="main-body settings-body">
        <h2>일반</h2>
        <Toggle label="새 작업을 맨 위에 추가" value={s.addToTop} onChange={(v) => set({ addToTop: v })} />
        <Toggle label="삭제하기 전에 확인" value={s.confirmDelete} onChange={(v) => set({ confirmDelete: v })} />
        <Toggle label="완료 소리 재생" value={s.playSound} onChange={(v) => set({ playSound: v })} />

        <h2>테마</h2>
        <div className="radio-group" role="radiogroup">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <label key={t}>
              <input type="radio" name="theme" checked={s.theme === t} onChange={() => set({ theme: t })} />
              {t === 'light' ? '밝은 테마' : t === 'dark' ? '어두운 테마' : '시스템 테마 사용'}
            </label>
          ))}
        </div>

        <h2>스마트 목록</h2>
        {(Object.keys(SMART_LABEL) as SmartListKey[]).map((k) => (
          <Toggle key={k} label={SMART_LABEL[k]} value={s.smartLists[k]} onChange={(v) => set({ smartLists: { ...s.smartLists, [k]: v } })} />
        ))}

        <h2>알림</h2>
        <button
          className="text-btn outline"
          onClick={() => {
            if ('Notification' in window) Notification.requestPermission();
          }}
        >
          브라우저 알림 허용
        </button>

        <h2>정보</h2>
        <p className="about">
          REA To Do 1.0.0 · Microsoft To Do(Windows)의 화면과 동작을 AI 에이전트(Claude Code)로 역분석하여 다시 만든 학습용 웹앱입니다.
          데이터는 이 브라우저(localStorage)에만 저장됩니다.
        </p>
        <button
          className="text-btn outline"
          onClick={() => {
            if (confirm('지금 있는 작업과 목록을 지우고 예시 데이터를 넣을까요?')) dispatch({ type: 'replaceData', ...sampleData() });
          }}
        >
          예시 데이터 넣기
        </button>{' '}
        <button
          className="text-btn outline danger"
          onClick={() => {
            if (confirm('모든 작업과 목록을 지울까요? 되돌릴 수 없습니다.')) {
              localStorage.clear();
              location.reload();
            }
          }}
        >
          모든 데이터 지우기
        </button>
      </div>
    </section>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <button role="switch" aria-checked={value} aria-label={label} className={`switch${value ? ' on' : ''}`} onClick={() => onChange(!value)}>
        <span />
      </button>
      <span className="switch-text">{value ? '켬' : '끔'}</span>
    </div>
  );
}
