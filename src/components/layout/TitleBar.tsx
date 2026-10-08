import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

/**
 * Custom frameless-window title bar.
 *
 * Renders only inside the Electron shell (or with ?titlebar=1 for preview).
 * The whole bar is a drag region; buttons opt out with `-webkit-app-region:
 * no-drag` (see the `.titlebar` rules in src/index.css), which is what makes
 * the window feel native: drag to move, double-click to maximize.
 */
interface TitleBarProps {
  title: string;
  subtitle?: string;
  /** Right-aligned slot rendered before the window controls (e.g. active module). */
  children?: React.ReactNode;
  /** Wired to the OS window controls; omitted in browser preview (inert buttons). */
  onWindow?: (action: 'minimize' | 'toggleMaximize' | 'close') => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title, subtitle, children, onWindow }) => {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const bridge = window.printcore?.window;
    if (!bridge) return;
    let mounted = true;
    Promise.resolve(bridge.isMaximized())
      .then((value) => mounted && setMaximized(Boolean(value)))
      .catch(() => {});
    const unsubscribe = bridge.onMaximizeChange((next) => setMaximized(next));
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <header className="titlebar no-print fixed inset-x-0 top-0 z-50 flex h-9 items-center bg-slate-950 text-slate-300">
      {/* Drag zone: wordmark + optional status slot */}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <div className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded ring-1 ring-emerald-500/40">
          <span className="bg-emerald-500/20 text-[8px] font-bold leading-none text-emerald-400">3D</span>
          <img
            src={`${import.meta.env.BASE_URL}icon.png`}
            alt=""
            aria-hidden="true"
            onError={(event) => event.currentTarget.remove()}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <span className="truncate text-xs font-semibold tracking-tight text-white">{title}</span>
        {subtitle && (
          <span className="hidden truncate text-[11px] text-slate-500 sm:inline">{subtitle}</span>
        )}
        {children && <div className="ml-2 flex items-center gap-2">{children}</div>}
      </div>

      {/* Window controls (never draggable) */}
      <div className="titlebar-controls flex h-full shrink-0 items-stretch">
        <button
          type="button"
          className="titlebar-btn"
          onClick={() => onWindow?.('minimize')}
          aria-label="Minimizar"
          title="Minimizar"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="titlebar-btn"
          onClick={() => onWindow?.('toggleMaximize')}
          aria-label={maximized ? 'Restaurar' : 'Maximizar'}
          title={maximized ? 'Restaurar' : 'Maximizar'}
        >
          {maximized ? (
            <Copy className="h-3 w-3" strokeWidth={1.75} />
          ) : (
            <Square className="h-3 w-3" strokeWidth={1.75} />
          )}
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-btn-close"
          onClick={() => onWindow?.('close')}
          aria-label="Cerrar"
          title="Cerrar"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
};
