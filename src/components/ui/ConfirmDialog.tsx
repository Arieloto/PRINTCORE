import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2, Info, ShieldAlert } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  /** danger = rojo (elimina datos) · warning = ámbar (pierde trabajo en pantalla) · info = azul (acción global reversible) */
  variant?: ConfirmVariant;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Si se define, el usuario debe escribir este texto (p. ej. "ELIMINAR") para habilitar el botón. Para acciones irreversibles masivas. */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES: Record<ConfirmVariant, { iconBg: string; iconColor: string; button: string; Icon: typeof AlertTriangle }> = {
  danger: {
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    button: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500',
    Icon: Trash2
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    Icon: AlertTriangle
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    button: 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-500',
    Icon: Info
  }
};

/**
 * Diálogo de confirmación moderno (2026): backdrop con blur, animación de entrada,
 * icono según severidad, cierre con Escape, confirmación con Enter y
 * modo "escribir para confirmar" para acciones irreversibles masivas.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  variant = 'danger',
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  requireText,
  onConfirm,
  onCancel
}) => {
  const { Icon, iconBg, iconColor, button } = VARIANT_STYLES[variant];
  const [typed, setTyped] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTyped('');
    // Foco inicial: el input de confirmación si existe, si no el botón Cancelar (evita Enter accidental).
    const t = setTimeout(() => {
      if (requireText) inputRef.current?.focus();
      else cancelRef.current?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, requireText, onCancel]);

  if (!open) return null;

  const canConfirm = !requireText || typed.trim().toUpperCase() === requireText.toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-[fade-in_150ms_ease-out]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 animate-[dialog-in_180ms_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 leading-snug">{title}</h3>
            <div className="text-xs text-slate-600 mt-1 leading-relaxed">{description}</div>
          </div>
        </div>

        {requireText && (
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-700">
              Escribe <span className="font-mono font-bold text-slate-900">{requireText}</span> para habilitar el botón
            </label>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canConfirm) onConfirm();
              }}
              placeholder={requireText}
              autoComplete="off"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            {typed.trim() !== '' && !canConfirm && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                El texto no coincide
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
