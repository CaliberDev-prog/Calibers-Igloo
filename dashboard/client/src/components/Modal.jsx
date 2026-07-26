import { useEffect, useRef } from 'react';

export default function Modal({ onClose, children, maxWidth = 'max-w-md' }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-dark-950/70 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`glass p-6 ${maxWidth} w-full mx-4 space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
