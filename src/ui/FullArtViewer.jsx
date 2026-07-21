import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { registerBackHandler } from './backNav.js';

export function FullArtViewer({ src, alt, title, onClose, children = null }) {
  const closeRef = useRef(null);

  useEffect(() => registerBackHandler(() => {
    onClose();
    return true;
  }), [onClose]);

  useEffect(() => {
    const previous = document.activeElement;
    document.documentElement.classList.add('full-art-open');
    closeRef.current?.focus();
    return () => {
      document.documentElement.classList.remove('full-art-open');
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  return createPortal(
    <div className="full-art-overlay" role="dialog" aria-modal="true" aria-label={`${title} full artwork`}
      onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); closeRef.current?.focus(); } }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <figure className="full-art-frame">
        {src ? <img src={src} alt={alt} /> : <div className="full-art-icon" aria-label={alt}>{children}</div>}
        <figcaption>{title}</figcaption>
        <button ref={closeRef} type="button" className="full-art-close" onClick={onClose} aria-label="Close full artwork">×</button>
      </figure>
    </div>,
    document.body,
  );
}
