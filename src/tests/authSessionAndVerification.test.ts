import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: createStorageMock(), writable: true });
}
if (typeof globalThis.sessionStorage === 'undefined') {
  Object.defineProperty(globalThis, 'sessionStorage', { value: createStorageMock(), writable: true });
}
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: { location: { origin: 'https://pawn-shop-management.web.app' } },
    writable: true,
  });
}

const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSendEmailVerification = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockSignOut = vi.fn();
const mockReload = vi.fn();
const mockApplyActionCode = vi.fn();

const mockDoc = vi.fn((...args: any[]) => ({ path: args.slice(1).join('/') }));
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCollection = vi.fn((...args: any[]) => ({ path: args.slice(1).join('/') }));
const mockQuery = vi.fn((...args: any[]) => args[0]);
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockGetDocs = vi.fn();

const mockAuthState: {
  currentUser: {
    uid: string;
    email: string;
    emailVerified: boolean;
  } | null;
} = {
  currentUser: null,
};

vi.mock('../services/firebase', () => ({
  db: { __mockDb: true },
  authPersistenceReady: Promise.resolve(),
  auth: {
    get currentUser() {
      return mockAuthState.currentUser;
    },
  },
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
  sendEmailVerification: (...args: any[]) => mockSendEmailVerification(...args),
  sendPasswordResetEmail: (...args: any[]) => mockSendPasswordResetEmail(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  reload: (...args: any[]) => mockReload(...args),
  applyActionCode: (...args: any[]) => mockApplyActionCode(...args),
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  limit: (...args: any[]) => mockLimit(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
}));

import {
  registerShopOwner,
  loginShopOwner,
  checkEmailVerificationStatus,
  verifyEmailWithActionCode,
  resendVerificationEmail,
  logoutShopOwner,
  isAuthOperationInProgress,
  hasValidUserSession,
  isPendingVerificationUid,
  recordLoginSession,
  isSessionExpired,
} from '../services/authService';
import {
  saveAppLockConfig,
  lockApp,
  unlockApp,
  isAppLocked,
} from '../services/appLockService';

const sampleRegistrationInput = {
  ownerName: 'Ramesh Verma',
  shopName: 'Verma Pawn & Jewellers',
  phone: '9876543210',
  address: '12 MG Road',
  email: '  Ramesh@Example.com ',
  password: 'StrongPassword123',
};

describe('Registration Spinner Fix, Email Verification Gate, and 24h Session / App Lock Separation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
    mockAuthState.currentUser = null;
    mockSetDoc.mockResolvedValue(undefined);
    mockSignOut.mockImplementation(async () => {
      mockAuthState.currentUser = null;
    });
    mockSendEmailVerification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
    mockAuthState.currentUser = null;
  });

  describe('1. Account Creation & Spinner Completion', () => {
    it('completes registration cleanly, sends email verification, marks pending UID, and never sets an authenticated session', async () => {
      const mockUser = {
        uid: 'uid-new-1',
        email: 'ramesh@example.com',
        emailVerified: false,
      };
      mockCreateUserWithEmailAndPassword.mockImplementation(async () => {
        mockAuthState.currentUser = mockUser;
        return { user: mockUser };
      });

      const result = await registerShopOwner(sampleRegistrationInput);

      expect(result.success).toBe(true);
      expect(result.email).toBe('ramesh@example.com');
      expect(result.verificationSent).toBe(true);
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'ramesh@example.com',
        'StrongPassword123'
      );
      expect(mockSetDoc).toHaveBeenCalledTimes(3);
      expect(mockSendEmailVerification).toHaveBeenCalledTimes(1);
      expect(mockSignOut).not.toHaveBeenCalled();
      expect(isPendingVerificationUid('uid-new-1')).toBe(true);
      expect(isSessionExpired()).toBe(true);
      expect(hasValidUserSession(mockUser)).toBe(false);
      expect(isAuthOperationInProgress()).toBe(false);
    });

    it('falls back to default verification email if continue URL domain is unauthorized', async () => {
      const mockUser = {
        uid: 'uid-fallback-1',
        email: 'ramesh@example.com',
        emailVerified: false,
      };
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      mockSendEmailVerification
        .mockRejectedValueOnce({ code: 'auth/unauthorized-continue-uri' })
        .mockResolvedValueOnce(undefined);

      const result = await registerShopOwner(sampleRegistrationInput);

      expect(result.success).toBe(true);
      expect(result.verificationSent).toBe(true);
      expect(mockSendEmailVerification).toHaveBeenCalledTimes(2);
      expect(mockSendEmailVerification.mock.calls[0][1]).toEqual({
        url: 'https://pawn-shop-management.web.app/?emailVerificationRedirect=1',
        handleCodeInApp: false,
      });
      expect(mockSendEmailVerification.mock.calls[1]).toHaveLength(1);
      expect(isAuthOperationInProgress()).toBe(false);
    });

    it('stops cleanly even when initial Firestore setup rejects transiently', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockUser = {
        uid: 'uid-warn-1',
        email: 'ramesh@example.com',
        emailVerified: false,
      };
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      mockSetDoc.mockRejectedValue(new Error('offline during registration'));

      const result = await registerShopOwner(sampleRegistrationInput);

      expect(result.success).toBe(true);
      expect(result.verificationSent).toBe(true);
      expect(isAuthOperationInProgress()).toBe(false);
      warnSpy.mockRestore();
    });

    it('prevents duplicate account creation when registration is already in progress', async () => {
      let resolveCreate!: (val: any) => void;
      const pendingCreate = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      mockCreateUserWithEmailAndPassword.mockReturnValue(pendingCreate);

      const firstPromise = registerShopOwner(sampleRegistrationInput);
      expect(isAuthOperationInProgress()).toBe(true);

      const duplicateAttempt = await registerShopOwner(sampleRegistrationInput);
      expect(duplicateAttempt).toEqual({
        success: false,
        error: 'Registration is already in progress. Please wait.',
      });
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledTimes(1);

      resolveCreate({
        user: { uid: 'uid-dup-1', email: 'ramesh@example.com', emailVerified: false },
      });
      const firstResult = await firstPromise;
      expect(firstResult.success).toBe(true);
      expect(isAuthOperationInProgress()).toBe(false);
    });

    it('maps Firebase Auth registration errors cleanly and clears in-progress flag', async () => {
      const errorCases = [
        { code: 'auth/email-already-in-use', expectedSubstring: 'already exists' },
        { code: 'auth/invalid-email', expectedSubstring: 'valid email address' },
        { code: 'auth/weak-password', expectedSubstring: 'at least 6 characters' },
        { code: 'auth/network-request-failed', expectedSubstring: 'Network connection failed' },
      ];

      for (const testCase of errorCases) {
        mockCreateUserWithEmailAndPassword.mockRejectedValueOnce({ code: testCase.code });
        const result = await registerShopOwner(sampleRegistrationInput);
        expect(result.success).toBe(false);
        expect(result.error).toContain(testCase.expectedSubstring);
        expect(isAuthOperationInProgress()).toBe(false);
      }
    });
  });

  describe('2. Strict Email Verification Gate & Login Redirect', () => {
    it('blocks verification bypass when Firebase reload() leaves emailVerified as false', async () => {
      const user = {
        uid: 'uid-unverified-1',
        email: 'unverified@example.com',
        emailVerified: false,
      };
      mockReload.mockResolvedValueOnce(undefined);

      const status = await checkEmailVerificationStatus(user as any);

      expect(mockReload).toHaveBeenCalledWith(user);
      expect(status.verified).toBe(false);
      expect(status.error).toBe(
        'Your email address is not verified yet. Please check your inbox and try again.'
      );
      expect(mockSignOut).not.toHaveBeenCalled();
    });

    it('clears pending flag & signs out once reload() confirms emailVerified is true so user manually logs in', async () => {
      const user = {
        uid: 'uid-verified-1',
        email: 'verified@example.com',
        emailVerified: false,
      };
      mockAuthState.currentUser = user;
      mockReload.mockImplementationOnce(async () => {
        user.emailVerified = true;
      });

      const status = await checkEmailVerificationStatus(user as any);

      expect(status).toEqual({ verified: true, email: 'verified@example.com' });
      expect(isPendingVerificationUid('uid-verified-1')).toBe(false);
      expect(isSessionExpired()).toBe(true);
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('handles oobCode email verification links and invalid/expired codes', async () => {
      mockAuthState.currentUser = {
        uid: 'uid-link-1',
        email: 'link@example.com',
        emailVerified: false,
      };
      mockApplyActionCode.mockResolvedValueOnce(undefined);
      mockReload.mockResolvedValueOnce(undefined);

      const ok = await verifyEmailWithActionCode('valid-oob-code');
      expect(ok).toEqual({ success: true });
      expect(mockApplyActionCode).toHaveBeenCalledWith(expect.anything(), 'valid-oob-code');
      expect(mockSignOut).toHaveBeenCalledTimes(1);

      mockApplyActionCode.mockRejectedValueOnce({ code: 'auth/expired-action-code' });
      const expired = await verifyEmailWithActionCode('expired-oob-code');
      expect(expired.success).toBe(false);
      expect(expired.error).toContain('expired');

      mockApplyActionCode.mockRejectedValueOnce({ code: 'auth/invalid-action-code' });
      const invalid = await verifyEmailWithActionCode('bad-oob-code');
      expect(invalid.success).toBe(false);
      expect(invalid.error).toContain('invalid');
    });

    it('detects already-verified user during resendVerificationEmail and enforces manual login redirect', async () => {
      const user = {
        uid: 'uid-resend-1',
        email: 'owner@example.com',
        emailVerified: false,
      };
      mockReload.mockImplementationOnce(async () => {
        user.emailVerified = true;
      });

      const res = await resendVerificationEmail(user as any);
      expect(res).toEqual({ success: true, alreadyVerified: true });
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockSendEmailVerification).not.toHaveBeenCalled();
    });

    it('blocks loginShopOwner when account is unverified and keeps user pending verification', async () => {
      const unverifiedUser = {
        uid: 'uid-login-unverified',
        email: 'owner@example.com',
        emailVerified: false,
      };
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: unverifiedUser });
      mockReload.mockResolvedValueOnce(undefined);

      const result = await loginShopOwner('owner@example.com', 'Password123');

      expect(result.success).toBe(false);
      expect(result.isUnverified).toBe(true);
      expect(result.error).toBe(
        'Your email address is not verified yet. Please check your inbox and try again.'
      );
      expect(isPendingVerificationUid('uid-login-unverified')).toBe(true);
      expect(hasValidUserSession(unverifiedUser)).toBe(false);
      expect(isAuthOperationInProgress()).toBe(false);
    });
  });

  describe('3. 24-Hour Persistent Session & App Lock Separation', () => {
    it('starts a 24-hour verified session on login, maintains it across refresh/app-lock, and expires after 24 hours', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-12T08:00:00Z'));

      const verifiedUser = {
        uid: 'uid-session-1',
        email: 'owner@example.com',
        emailVerified: true,
      };
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: verifiedUser });

      const loginResult = await loginShopOwner('owner@example.com', 'Password123');
      expect(loginResult.success).toBe(true);
      expect(hasValidUserSession(verifiedUser)).toBe(true);
      expect(isAuthOperationInProgress()).toBe(false);

      // Engaging and unlocking App Lock must NEVER invalidate the 24h Firebase Auth session
      saveAppLockConfig({
        type: 'pin',
        hash: 'mock-sha256-hash',
        biometricEnabled: false,
        lastActive: Date.now(),
      });
      lockApp();
      expect(isAppLocked()).toBe(true);
      expect(hasValidUserSession(verifiedUser)).toBe(true);
      expect(mockSignOut).not.toHaveBeenCalled();

      unlockApp();
      expect(isAppLocked()).toBe(false);
      expect(hasValidUserSession(verifiedUser)).toBe(true);

      // Still valid at 23h 59m
      vi.advanceTimersByTime(23 * 60 * 60 * 1000 + 59 * 60 * 1000);
      expect(hasValidUserSession(verifiedUser)).toBe(true);

      // Expired past 24h
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(hasValidUserSession(verifiedUser)).toBe(false);
    });

    it('rejects session validation for wrong UID or unverified Firebase user', () => {
      recordLoginSession('uid-A');
      expect(hasValidUserSession({ uid: 'uid-A', emailVerified: true })).toBe(true);
      expect(hasValidUserSession({ uid: 'uid-A', emailVerified: false })).toBe(false);
      expect(hasValidUserSession({ uid: 'uid-B', emailVerified: true })).toBe(false);
    });

    it('explicit logout clears both the 24h auth session and active App Lock overlay state', async () => {
      recordLoginSession('uid-logout-1');
      saveAppLockConfig({
        type: 'pin',
        hash: 'mock-sha256-hash',
        biometricEnabled: false,
        lastActive: Date.now(),
      });
      lockApp();
      expect(isAppLocked()).toBe(true);

      await logoutShopOwner();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(isSessionExpired()).toBe(true);
      expect(hasValidUserSession({ uid: 'uid-logout-1', emailVerified: true })).toBe(false);
      expect(isAppLocked()).toBe(false);
    });
  });
});
