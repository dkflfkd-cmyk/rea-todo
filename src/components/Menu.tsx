import { useEffect, useRef } from 'react';
import { Icon } from '../icons';

export type MenuItem =
  | { label: string; icon?: string; danger?: boolean; checked?: boolean; onClick: () => void }
  | { divider: true };

export function Menu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  // keep the menu inside the window
  const left = Math.min(x, window.innerWidth - 260);
  const top = Math.min(y, window.innerHeight - items.length * 38 - 16);

  return (
    <div className="menu" ref={ref} style={{ left, top: Math.max(8, top) }} role="menu">
      {items.map((it, i) =>
        'divider' in it ? (
          <div key={i} className="menu-divider" />
        ) : (
          <button
            key={i}
            role="menuitem"
            className={`menu-item${it.danger ? ' danger' : ''}`}
            onClick={() => {
              it.onClick();
              onClose();
            }}
          >
            <span className="menu-icon">{it.icon && <Icon name={it.icon} size={16} />}</span>
            <span>{it.label}</span>
            {it.checked && (
              <span className="menu-check">
                <Icon name="check" size={16} />
              </span>
            )}
          </button>
        ),
      )}
    </div>
  );
}
