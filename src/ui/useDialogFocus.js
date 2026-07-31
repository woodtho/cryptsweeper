import { useEffect } from 'react';

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useDialogFocus(ref, onClose, active = true) {
  useEffect(() => {
    if (!active || !ref.current) return undefined;
    const previous = document.activeElement;
    const dialog = ref.current;
    const focusFirst = () => (dialog.querySelector(FOCUSABLE) || dialog).focus();
    const frame = requestAnimationFrame(focusFirst);
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll(FOCUSABLE)]
        .filter(element => element.getClientRects().length && !element.closest('[aria-hidden="true"]'));
      if (!controls.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      dialog.removeEventListener('keydown', onKeyDown);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [active, ref]);
}
