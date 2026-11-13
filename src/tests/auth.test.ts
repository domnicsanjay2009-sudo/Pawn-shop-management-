import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Provide localStorage mock for Node test environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true });
}

import {
  formatAuthError,
  isSessionExpired,
  recordLoginSession,
  clearLoginSession
} from '../services/authService';

describe('Firebase Authentication Unit Tests & Error Mappings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('1. Error Code Formatting & Configuration Guidance', () => {
    it('should provide clear, actionable guidance for auth/configuration-not-found', () => {
      const err = { code: 'auth/configuration-not-found', message: 'CONFIGURATION_NOT_FOUND' };
      const formatted = formatAuthError(err);
      expect(formatted).toContain('Firebase Authentication is not yet activated');
      expect(formatted).toContain('Get Started');
      expect(formatted).toContain('Email/Password');
    });

    it('should map auth/invalid-credential to a helpful user message', () => {
      const err = { code: 'auth/invalid-credential' };
      const formatted = formatAuthError(err);
      expect(formatted).toBe('Incorrect password. Please try again.');
    });

    it('should map auth/wrong-password correctly', () => {
      const err = { code: 'auth/wrong-password' };
      const formatted = formatAuthError(err);
      expect(formatted).toBe('Incorrect password. Please try again.');
    });

    it('should map auth/user-not-found correctly', () => {
      const err = { code: 'auth/user-not-found' };
      const formatted = formatAuthError(err);
      expect(formatted).toBe('This mail ID is not found. Please create an account first.');
    });

    it('should map auth/email-already-in-use correctly', () => {
      const err = { code: 'auth/email-already-in-use' };
      const formatted = formatAuthError(err);
      expect(formatted).toBe('An account with this email ID already exists. Please login instead.');
    });

    it('should map auth/too-many-requests correctly', () => {
      const err = { code: 'auth/too-many-requests' };
      const formatted = formatAuthError(err);
      expect(formatted).toContain('Access to this account has been temporarily disabled');
    });

    it('should fall back cleanly to error message or default message', () => {
      expect(formatAuthError({ message: 'Custom server error' })).toBe('Custom server error');
      expect(formatAuthError(null)).toBe('Authentication failed. Please check your credentials.');
    });
  });

  describe('2. 24-Hour Session Lifecycle Policy', () => {
    it('should treat empty session as expired', () => {
      expect(isSessionExpired()).toBe(true);
    });

    it('should treat fresh session as active and not expired', () => {
      recordLoginSession();
      expect(isSessionExpired()).toBe(false);
    });

    it('should expire session after 24 hours (86,400,000 ms)', () => {
      const now = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      recordLoginSession();
      expect(isSessionExpired()).toBe(false);

      // Advance time by 24 hours + 1 minute
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 60000);
      expect(isSessionExpired()).toBe(true);
    });

    it('should clear session upon explicit logout', () => {
      recordLoginSession();
      expect(isSessionExpired()).toBe(false);

      clearLoginSession();
      expect(isSessionExpired()).toBe(true);
    });
  });
});
