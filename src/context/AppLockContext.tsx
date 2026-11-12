import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAppLockConfig,
  saveAppLockConfig,
  isAppLocked,
  lockApp,
  unlockApp,
  touchLastActive,
  verifyCredential,
  authenticateWithBiometrics,
  isBiometricSupported
} from '../services/appLockService';
import { AppLockConfig } from '../types';

interface AppLockContextType {
  isLocked: boolean;
  config: AppLockConfig;
  biometricAvailable: boolean;
  verifyInput: (text: string) => Promise<boolean>;
  triggerBiometric: () => Promise<boolean>;
  setLockConfig: (config: AppLockConfig) => void;
  manualLock: () => void;
  manualUnlock: () => void;
}

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

export const AppLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppLockConfig>(getAppLockConfig());
  const [isLocked, setIsLocked] = useState<boolean>(isAppLocked());
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);

  useEffect(() => {
    isBiometricSupported().then(setBiometricAvailable);
  }, []);

  // Background and inactivity tracking (2-minute rule)
  useEffect(() => {
    touchLastActive();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        touchLastActive();
      } else {
        if (isAppLocked()) {
          setIsLocked(true);
        } else {
          touchLastActive();
        }
      }
    };

    const handleUserActivity = () => {
      if (!isLocked) {
        touchLastActive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    // Periodic check every 15 seconds
    const interval = setInterval(() => {
      if (!isLocked && isAppLocked()) {
        setIsLocked(true);
      }
    }, 15000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      clearInterval(interval);
    };
  }, [isLocked]);

  const verifyInput = async (text: string): Promise<boolean> => {
    const valid = await verifyCredential(text);
    if (valid) {
      unlockApp();
      setIsLocked(false);
    }
    return valid;
  };

  const triggerBiometric = async (): Promise<boolean> => {
    if (!config.biometricEnabled) return false;
    const ok = await authenticateWithBiometrics();
    if (ok) {
      unlockApp();
      setIsLocked(false);
    }
    return ok;
  };

  const setLockConfig = (newConfig: AppLockConfig) => {
    saveAppLockConfig(newConfig);
    setConfig(newConfig);
  };

  const manualLock = () => {
    lockApp();
    setIsLocked(true);
  };

  const manualUnlock = () => {
    unlockApp();
    setIsLocked(false);
  };

  return (
    <AppLockContext.Provider
      value={{
        isLocked,
        config,
        biometricAvailable,
        verifyInput,
        triggerBiometric,
        setLockConfig,
        manualLock,
        manualUnlock,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
};

export const useAppLock = () => {
  const context = useContext(AppLockContext);
  if (!context) throw new Error('useAppLock must be used within AppLockProvider');
  return context;
};
