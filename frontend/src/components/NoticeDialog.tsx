import { useEffect, useRef } from 'react';
import { CheckCheck } from 'lucide-react';

export function NoticeDialog({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} aria-labelledby="hq-alert-title" aria-describedby="hq-alert-body" className="hq-alert hq-notice-dialog"
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <CheckCheck size={29} aria-hidden="true" />
      <h3 id="hq-alert-title">{title}</h3>
      <p id="hq-alert-body">{message}</p>
      <button type="button" className="hq-alert-confirm" onClick={onClose}>확인</button>
    </dialog>
  );
}
