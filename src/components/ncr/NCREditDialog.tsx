import { useId, type ReactNode } from 'react';
import { useDialogFocus } from '../../hooks/useDialogFocus';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Full edit dialog for an NCR (L6): focus stays inside, Esc closes, focus returns after. */
export function NCREditDialog({ title, onClose, children }: Props) {
  const box = useDialogFocus<HTMLDivElement>(onClose);
  const id = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className="my-8 w-full max-w-3xl rounded-xl border border-border bg-surface p-5 shadow-2xl focus:outline-none"
      >
        <h2 id={id} className="mb-4 text-[15px] font-semibold text-text-primary">{title}</h2>
        {children}
      </div>
    </div>
  );
}
