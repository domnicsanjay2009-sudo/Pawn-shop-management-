import {
  collection,
  doc,
  addDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { SupportMessage, SupportConversation } from '../types';

const CONVERSATIONS_COLLECTION = 'support_conversations';

/**
 * Subscribes to real-time human Customer Care messages for a shop
 */
export function subscribeToSupportMessages(
  shopId: string,
  onUpdate: (messages: SupportMessage[]) => void
): () => void {
  const messagesRef = collection(db, `${CONVERSATIONS_COLLECTION}/${shopId}/messages`);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const list: SupportMessage[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SupportMessage));
    onUpdate(list);
  }, (err) => {
    console.error('Error listening to support messages:', err);
  });
}

/**
 * Sends a customer message to the Admin Inbox
 */
export async function sendCustomerMessage(
  shopId: string,
  ownerName: string,
  ownerEmail: string,
  shopName: string,
  text: string
): Promise<void> {
  const convRef = doc(db, CONVERSATIONS_COLLECTION, shopId);
  const now = Date.now();

  // Ensure conversation header exists for future Admin Panel inbox
  await setDoc(convRef, {
    shopId,
    ownerName,
    ownerEmail,
    shopName,
    lastMessage: text,
    lastUpdated: now,
    status: 'open',
    serverUpdatedAt: serverTimestamp(),
  }, { merge: true });

  // Add individual message
  const msgRef = collection(db, `${CONVERSATIONS_COLLECTION}/${shopId}/messages`);
  await addDoc(msgRef, {
    conversationId: shopId,
    shopId,
    senderType: 'customer',
    senderName: ownerName,
    messageText: text,
    timestamp: now,
    serverTimestamp: serverTimestamp(),
  });
}

/**
 * Premium AI Customer Care powered by Gemini through secure backend function or proxy
 * Ensures NO private financial customer records are ever sent to Gemini.
 */
export async function askGeminiCustomerCare(
  question: string,
  isPremium: boolean
): Promise<{ text: string; error?: string }> {
  if (!isPremium) {
    return {
      text: '',
      error: 'AI Customer Care is an exclusive feature of the Yearly Premium Plan.'
    };
  }

  try {
    // In production, this calls the secure backend endpoint:
    // POST /api/ask-gemini { question }
    // which holds the GEMINI_API_KEY privately.
    const backendEndpoint = import.meta.env.VITE_BACKEND_GEMINI_ENDPOINT ||
      (import.meta.env.VITE_BACKEND_API_URL ? `${import.meta.env.VITE_BACKEND_API_URL.replace(/\/+$/, '')}/api/ask-gemini` : '');

    if (backendEndpoint) {
      let authToken = '';
      try {
        if (auth.currentUser) {
          authToken = await auth.currentUser.getIdToken();
        }
      } catch (tokenErr) {
        console.warn('Could not fetch auth token for AI support:', tokenErr);
      }

      const res = await fetch(backendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      return { text: data.reply || data.text };
    }

    // Direct client fallback if API key is present in testing environment
    const testApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (testApiKey && !testApiKey.includes('DEMO')) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${testApiKey}`;
      const payload = {
        contents: [{
          role: "user",
          parts: [{
            text: `You are an AI Customer Care assistant for Pawn Shop Management software.
Guidelines:
1. Provide concise, clear, polite guidance about how to use the app (e.g. adding parties, creating pledge bills, recording payments, closing bills, app lock, settings).
2. Do not fabricate or request sensitive customer financial numbers.
3. Be friendly and helpful.
User Question: ${question}`
          }]
        }]
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return { text: data.candidates[0].content.parts[0].text };
      }
    }

    // High-quality contextual fallback answers for common pawn shop software operations
    const qLower = question.toLowerCase();
    if (qLower.includes('add bill') || qLower.includes('create bill') || qLower.includes('new bill')) {
      return {
        text: 'To create a bill: Navigate to "Parties", select a customer (or tap "Add Party" if new), and click "Add Bill". Choose the collateral category (Gold, Silver, or Others), enter gross/net weight and principal amount. The interest rate and duration will auto-fill from your Settings.'
      };
    } else if (qLower.includes('payment') || qLower.includes('pay') || qLower.includes('interest')) {
      return {
        text: 'Payments automatically settle any accrued interest first based on the days elapsed since the bill was created. Any extra payment amount goes directly to reducing the outstanding principal.'
      };
    } else if (qLower.includes('close') || qLower.includes('closing')) {
      return {
        text: 'To close a bill: Open the party detail view, find the active bill, and click "Close Bill". The system reconciles the remaining principal plus accrued interest to show the exact final settlement amount.'
      };
    } else if (qLower.includes('lock') || qLower.includes('pin') || qLower.includes('fingerprint')) {
      return {
        text: 'App Lock can be configured in Settings with a 4-6 digit PIN or a Password, plus Biometric/Fingerprint authentication. It automatically protects your shop data with a 2-minute background inactivity lock.'
      };
    } else if (qLower.includes('staff') || qLower.includes('90') || qLower.includes('device')) {
      return {
        text: 'As a Premium subscriber, you can connect up to 9 devices and issue 90-day Temporary Staff Passes in the Subscription section to delegate counter tasks safely.'
      };
    }

    return {
      text: "I am your Pawn Shop AI Assistant. I can assist you with bill creation, interest rules, customer records, payment entries, closing settlements, and security lock setup. How can I help you today?"
    };
  } catch (error: any) {
    return {
      text: '',
      error: 'AI Customer Care service is currently unreachable. Please try again or switch to standard Customer Care.'
    };
  }
}
