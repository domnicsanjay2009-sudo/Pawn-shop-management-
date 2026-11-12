import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDkMbcq1gd61YHlzLcKwIbeE1NiFoaffd0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pawn-shop-management.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pawn-shop-management",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pawn-shop-management.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "172363118602",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:172363118602:web:930805150a14d83a6287f3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WHK26V82K6"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
