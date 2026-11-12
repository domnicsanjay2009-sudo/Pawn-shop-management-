import { useEffect } from 'react';

/**
 * Global reference counter for modal background scroll locks.
 * Ensures that if multiple modals are opened or stacked, closing one
 * will not prematurely unlock the background if another modal is still open.
 */
let activeLockCount = 0;
let previousBodyOverflow = '';
let previousDocOverflow = '';
let previousPaddingRight = '';

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  activeLockCount++;
  if (activeLockCount === 1) {
    const body = document.body;
    const docEl = document.documentElement;

    previousBodyOverflow = body.style.overflow;
    previousDocOverflow = docEl.style.overflow;
    previousPaddingRight = body.style.paddingRight;

    // Prevent content jump caused by scrollbar disappearing
    const scrollbarWidth = window.innerWidth - docEl.clientWidth;
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    body.style.overflow = 'hidden';
    docEl.style.overflow = 'hidden';
  }
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  activeLockCount = Math.max(0, activeLockCount - 1);
  if (activeLockCount === 0) {
    const body = document.body;
    const docEl = document.documentElement;

    body.style.overflow = previousBodyOverflow;
    docEl.style.overflow = previousDocOverflow;
    body.style.paddingRight = previousPaddingRight;
  }
}

export function isBodyScrollLocked(): boolean {
  return activeLockCount > 0;
}

/**
 * Custom hook to lock background scrolling and interactions while a modal is mounted.
 * Fully restores background scrolling when unmounted or when isOpen becomes false.
 */
export function useModalScrollLock(isOpen: boolean = true, onEscapeClose?: () => void): void {
  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscapeClose) {
        onEscapeClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unlockBodyScroll();
    };
  }, [isOpen, onEscapeClose]);
}
