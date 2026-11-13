/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_RAZORPAY_KEY_ID?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_BACKEND_GEMINI_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*/api/index.js' {
  const handler: (req: any, res: any) => Promise<void>;
  export default handler;
}

declare module '../../api/index.js' {
  const handler: (req: any, res: any) => Promise<void>;
  export default handler;
}

