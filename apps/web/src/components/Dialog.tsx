import { type ReactNode, useEffect } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
}

export function Dialog({ open, title, onClose, children, actions, wide }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        // Fecha só se clicar no backdrop, não dentro do dialog.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/*
        Optamos por <div role="dialog"> em vez do elemento nativo <dialog>
        porque o nativo traz contrato imperativo (showModal/close, top-layer,
        ESC do browser) que colide com nossa API declarativa `open`.
      */}
      <div
        className="dialog"
        style={wide ? { maxWidth: 640 } : undefined}
        // biome-ignore lint/a11y/useSemanticElements: elemento nativo <dialog> tem contrato imperativo incompatível com nossa API declarativa
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <h2 id="dialog-title" className="dialog-title">
          {title}
        </h2>
        <div>{children}</div>
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}
