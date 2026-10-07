// PIN box for the W: files page. First visit: choose a PIN. Later: type it to
// unlock the files for 15 minutes. 5 wrong tries lock it for 15 minutes.
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { setPin, unlockPin, type PinStatus } from './wfilesApi';

interface WFilePinBoxProps {
  status: PinStatus;
  onUnlocked: () => void;
}

export function WFilePinBox({ status, onUnlocked }: WFilePinBoxProps) {
  const [pin, setPinText] = useState('');
  const [pin2, setPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstTime = !status.hasPin;
  const lockedTill = status.lockedUntil ? new Date(status.lockedUntil).toLocaleTimeString() : null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) { setError('The PIN must be 4 to 6 numbers.'); return; }
    if (firstTime && pin !== pin2) { setError('The two PINs are not the same.'); return; }
    setBusy(true);
    setError(null);
    try {
      await (firstTime ? setPin(pin) : unlockPin(pin));
      onUnlocked();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check the PIN.');
      setPinText('');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-border/60 bg-surface px-3 py-2 text-center text-[16px] tracking-[0.4em] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <form onSubmit={submit} className="mx-auto mt-10 w-full max-w-sm rounded-2xl border border-border/60 bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Lock className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="text-[15px] font-semibold text-text-primary">{firstTime ? 'Choose your files PIN' : 'Enter your files PIN'}</h2>
      </div>
      <p className="mb-4 text-[12px] text-text-tertiary">
        {firstTime
          ? 'Pick 4 to 6 numbers. You will type this PIN to open the QMS files. If you forget it, ask the QMS admin to reset it.'
          : 'The files stay open for 15 minutes after you type your PIN.'}
      </p>
      {lockedTill && <p className="mb-3 text-[12px] font-semibold text-danger-text">Too many wrong tries. Try again after {lockedTill}.</p>}
      <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} aria-label="PIN"
        value={pin} onChange={(e) => setPinText(e.target.value.replace(/\D/g, ''))} className={inputCls} autoFocus />
      {firstTime && (
        <input type="password" inputMode="numeric" autoComplete="off" maxLength={6} aria-label="PIN again" placeholder="again"
          value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} className={`${inputCls} mt-2`} />
      )}
      {error && <p className="mt-3 text-[12px] text-danger-text" role="alert">{error}</p>}
      <button type="submit" disabled={busy}
        className="mt-4 w-full rounded-xl bg-accent px-3 py-2 text-[13px] font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-60">
        {busy ? 'Checking…' : firstTime ? 'Save PIN' : 'Unlock'}
      </button>
    </form>
  );
}
