import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AppSettings } from '../types';

const SETTINGS_COLLECTION = 'settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  shopId: '',
  defaultInterestDuration: 'Monthly',
  defaultGoldPercentage: 2.0,
  defaultSilverPercentage: 3.0,
  defaultOthersPercentage: 4.0,
  updatedAt: Date.now(),
};

export async function getSettings(shopId: string): Promise<AppSettings> {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, shopId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as AppSettings;
    }
    return { ...DEFAULT_APP_SETTINGS, shopId };
  } catch (e) {
    console.error('Error fetching settings:', e);
    return { ...DEFAULT_APP_SETTINGS, shopId };
  }
}

export async function saveSettings(shopId: string, settings: Partial<AppSettings>): Promise<void> {
  const ref = doc(db, SETTINGS_COLLECTION, shopId);
  await setDoc(ref, {
    ...settings,
    shopId,
    updatedAt: Date.now(),
  }, { merge: true });
}
