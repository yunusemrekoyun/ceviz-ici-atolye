'use client';

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

// ── Types ────────────────────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** 'sm' = 448px  |  'md' = 560px (default)  |  'lg' = 720px */
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

// ── Component ────────────────────────────────────────────────────────────────

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
}: ModalProps) {

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKey]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        /* Backdrop + scroll container — one element handles both */
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          aria-modal="true"
          role="dialog"
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              className={`w-full ${SIZE[size]} modal-shell flex flex-col overflow-hidden`}
            >
              {/* Modal header */}
              <div
                className="px-6 py-4 border-b border-m-border flex items-start justify-between shrink-0"
                style={{
                  background: 'linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 9%, transparent) 0%, transparent 65%)',
                }}
              >
                <div>
                  <h2 className="font-bold text-main text-base leading-snug">{title}</h2>
                  {description && (
                    <p className="text-[11px] text-subtle mt-0.5 leading-relaxed">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="btn-icon w-8 h-8 shrink-0 ml-4 mt-0.5"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal body — scrolls internally so the submit row stays
                  reachable even when the form is taller than the viewport. */}
              <div className="px-6 py-5 overflow-y-auto min-h-0">
                {children}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
