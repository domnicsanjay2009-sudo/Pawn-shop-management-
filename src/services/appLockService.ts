import { AppLockConfig } from '../types';

const APP_LOCK_STORAGE_KEY = 'psm_app_lock_config';
const LOCK_STATE_KEY = 'psm_is_app_locked';
const LAST_ACTIVE_KEY = 'psm_last_active_timestamp';
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

// Simple SHA-256 hash helper using browser crypto API
export async function hashCredential(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getAppLockConfig(): AppLockConfig {
  try {
    const raw = localStorage.getItem(APP_LOCK_STORAGE_KEY);
    if (!raw) {
      return {
        type: 'none',
        hash: '',
        biometricEnabled: false,
        lastActive: Date.now()
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      type: 'none',
      hash: '',
      biometricEnabled: false,
      lastActive: Date.now()
    };
  }
}

export function saveAppLockConfig(config: AppLockConfig): void {
  localStorage.setItem(APP_LOCK_STORAGE_KEY, JSON.stringify(config));
}

export function isAppLocked(): boolean {
  const config = getAppLockConfig();
  if (config.type === 'none') return false;

  const lockedFlag = localStorage.getItem(LOCK_STATE_KEY) ?? sessionStorage.getItem(LOCK_STATE_KEY);
  if (lockedFlag === 'true') return true;

  // Check 2-minute background inactivity
  const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
  if (lastActiveStr) {
    const lastActive = parseInt(lastActiveStr, 10);
    if (!isNaN(lastActive) && Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
      localStorage.setItem(LOCK_STATE_KEY, 'true');
      sessionStorage.setItem(LOCK_STATE_KEY, 'true');
      return true;
    }
  }

  return false;
}

export function lockApp(): void {
  const config = getAppLockConfig();
  if (config.type !== 'none') {
    localStorage.setItem(LOCK_STATE_KEY, 'true');
    sessionStorage.setItem(LOCK_STATE_KEY, 'true');
  }
}

export function unlockApp(): void {
  localStorage.removeItem(LOCK_STATE_KEY);
  sessionStorage.removeItem(LOCK_STATE_KEY);
  touchLastActive();
}

export function clearAppLockActiveState(): void {
  localStorage.removeItem(LOCK_STATE_KEY);
  sessionStorage.removeItem(LOCK_STATE_KEY);
  localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
}

export function touchLastActive(): void {
  localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
}

export async function verifyCredential(input: string): Promise<boolean> {
  const config = getAppLockConfig();
  if (config.type === 'none') return true;

  const inputHash = await hashCredential(input);
  return inputHash === config.hash;
}

/**
 * Biometric authentication via WebAuthn or device biometric API
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) {
      return false;
    }

    const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!isAvailable) {
      return false;
    }

    // Trigger platform credential challenge
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Prompt user biometric verification
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        userVerification: 'required',
        timeout: 60000,
      }
    });

    return !!credential;
  } catch (error) {
    console.warn('Biometric challenge cancelled or not enrolled:', error);
    return false;
  }
}

/**
 * Checks if device hardware supports biometric platform authenticator
 */
export async function isBiometricSupported(): Promise<boolean> {
  try {
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}
