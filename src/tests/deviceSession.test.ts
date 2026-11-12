import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getClientDeviceMetadata } from '../services/deviceService';

// Mock localStorage for Vitest
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('Device Telemetry & Persistent Identifier', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('generates and persists a unique device ID across sessions', () => {
    const meta1 = getClientDeviceMetadata();
    expect(meta1.deviceId).toBeDefined();
    expect(meta1.deviceId.startsWith('dev_')).toBe(true);

    const savedId = localStorage.getItem('psm_device_id');
    expect(savedId).toBe(meta1.deviceId);

    // Call again - should reuse identical persisted device ID
    const meta2 = getClientDeviceMetadata();
    expect(meta2.deviceId).toBe(meta1.deviceId);
  });

  it('detects device type, browser, and operating system', () => {
    const meta = getClientDeviceMetadata();
    expect(['desktop', 'mobile', 'tablet']).toContain(meta.deviceType);
    expect(typeof meta.browser).toBe('string');
    expect(typeof meta.operatingSystem).toBe('string');
    expect(typeof meta.deviceName).toBe('string');
    expect(meta.screenResolution).toBeDefined();
  });
});

describe('Heartbeat & Session Telemetry Status Rules', () => {
  const ONLINE_THRESHOLD_MS = 90 * 1000;

  function computeLiveSessionStatus(
    lastHeartbeatAt: number,
    sessionStatus: 'online' | 'offline' | 'expired' | 'revoked',
    now: number
  ): 'online' | 'offline' | 'expired' | 'revoked' {
    if (sessionStatus === 'revoked') return 'revoked';
    if (sessionStatus === 'expired') return 'expired';
    if (sessionStatus === 'offline') return 'offline';

    const diff = now - lastHeartbeatAt;
    if (diff <= ONLINE_THRESHOLD_MS) {
      return 'online';
    }
    return 'offline';
  }

  it('evaluates session as live online when heartbeat is received within 90 seconds', () => {
    const now = Date.now();
    const status = computeLiveSessionStatus(now - 15000, 'online', now); // 15 seconds ago
    expect(status).toBe('online');
  });

  it('transitions session to offline when heartbeat exceeds 90 seconds', () => {
    const now = Date.now();
    const status = computeLiveSessionStatus(now - 95000, 'online', now); // 95 seconds ago
    expect(status).toBe('offline');
  });

  it('strictly preserves revoked status regardless of recent heartbeats', () => {
    const now = Date.now();
    const status = computeLiveSessionStatus(now - 5000, 'revoked', now); // heartbeat 5s ago but revoked
    expect(status).toBe('revoked');
  });
});

describe('Subscription Device Quota Policy', () => {
  const PLANS: Record<string, number> = {
    'Yearly': 3,
    'Yearly Premium': 9,
  };

  function canRegisterDevice(
    plan: string,
    currentActiveDeviceCount: number,
    isDeviceAlreadyRegistered: boolean
  ): { allowed: boolean; maxDevices: number } {
    const maxDevices = PLANS[plan] || 3;
    if (isDeviceAlreadyRegistered) {
      return { allowed: true, maxDevices };
    }
    return {
      allowed: currentActiveDeviceCount < maxDevices,
      maxDevices
    };
  }

  it('allows registration when under plan quota', () => {
    const res = canRegisterDevice('Yearly', 2, false);
    expect(res.allowed).toBe(true);
    expect(res.maxDevices).toBe(3);
  });

  it('blocks new device registration when 3 device limit is reached on Yearly plan', () => {
    const res = canRegisterDevice('Yearly', 3, false);
    expect(res.allowed).toBe(false);
  });

  it('allows already registered active device to reconnect without consuming extra quota', () => {
    const res = canRegisterDevice('Yearly', 3, true);
    expect(res.allowed).toBe(true);
  });

  it('supports up to 9 devices on Yearly Premium plan', () => {
    const res = canRegisterDevice('Yearly Premium', 8, false);
    expect(res.allowed).toBe(true);
    expect(res.maxDevices).toBe(9);

    const resBlocked = canRegisterDevice('Yearly Premium', 9, false);
    expect(resBlocked.allowed).toBe(false);
  });
});
