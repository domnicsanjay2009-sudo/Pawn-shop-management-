import { DeviceType } from '../types';

const DEVICE_ID_KEY = 'psm_device_id';

/**
 * Retrieves or generates a unique, persistent Device UUID stored on the client
 */
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = 'dev_' + crypto.randomUUID();
    } else {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Detects browser brand and version from userAgent
 */
export function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown Browser';
  const ua = navigator.userAgent;

  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/);
    return `Edge ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    return `Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    return `Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    const match = ua.match(/Version\/([\d.]+)/);
    return `Safari ${match ? match[1].split('.')[0] : ''}`.trim();
  }
  return 'Browser (Standard)';
}

/**
 * Detects operating system from userAgent and platform
 */
export function detectOperatingSystem(): string {
  if (typeof navigator === 'undefined') return 'Unknown OS';
  const ua = navigator.userAgent;
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

  if (/Win/i.test(platform) || /Windows/i.test(ua)) {
    if (/Windows NT 10.0/i.test(ua)) {
      return 'Windows 10/11';
    }
    return 'Windows';
  }
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux/i.test(platform) || /Linux/i.test(ua)) return 'Linux';

  return 'Unknown OS';
}

/**
 * Detects device form factor
 */
export function detectDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Constructs a friendly human-readable Device Name
 */
export function generateDeviceName(): string {
  const browser = detectBrowser();
  const os = detectOperatingSystem();
  const type = detectDeviceType();
  const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);

  return `${browser} on ${os} (${capitalizedType})`;
}

/**
 * Gets complete client metadata snapshot
 */
export function getClientDeviceMetadata() {
  return {
    deviceId: getOrCreateDeviceId(),
    deviceName: generateDeviceName(),
    deviceType: detectDeviceType(),
    browser: detectBrowser(),
    operatingSystem: detectOperatingSystem(),
    screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080',
  };
}
