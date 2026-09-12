'use client';

import { useEffect } from 'react';
import RadialEntityMenu from './RadialEntityMenu';

export default function EntityWheelModal({ open, entities, counts, activeKey, onSelect, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-overlayFadeIn"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center animate-wheelPopIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          title="Cerrar"
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full border border-border bg-surface text-text-secondary hover:text-text-primary cursor-pointer flex items-center justify-center text-sm"
        >
          ✕
        </button>
        <span className="mb-4 text-[11px] text-white/70 uppercase tracking-widest">
          Elige un módulo
        </span>
        <RadialEntityMenu
          entities={entities}
          counts={counts}
          activeKey={activeKey}
          onSelect={onSelect}
          size={380}
        />
      </div>
    </div>
  );
}
