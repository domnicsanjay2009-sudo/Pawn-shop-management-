import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';

// Configuration loaded from environment variables (.env.local) with production defaults
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDkMbcq1gd61YHlzLcKwIbeE1NiFoaffd0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pawn-shop-management.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pawn-shop-management",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pawn-shop-management.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "172363118602",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:172363118602:web:930805150a14d83a6287f3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WHK26V82K6"
};

// Initialize Firebase App safely (singleton)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Core Firebase Services
export const auth = getAuth(app);
export const authPersistenceReady: Promise<void> =
  typeof window !== 'undefined'
    ? setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.warn('Unable to apply browserLocalPersistence:', err);
      })
    : Promise.resolve();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-south1'); // Asia-South1 (Mumbai) region

// Optional Analytics (only initialized when supported in browser environment)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics unsupported or blocked by ad-blocker
  });
}

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('DEMO-KEY'));
};
