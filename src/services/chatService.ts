import {
  collection,
  doc,
  addDoc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { SupportMessage } from '../types';

const CONVERSATIONS_COLLECTION = 'support_conversations';
const SEND_TIMEOUT_MS = 15000;
const inFlightSends = new Map<string, Promise<SupportMessage>>();

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function generateClientMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Subscribes to real-time human Customer Care messages for a shop
 */
export function subscribeToSupportMessages(
  shopId: string,
  onUpdate: (messages: SupportMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  const messagesRef = collection(db, `${CONVERSATIONS_COLLECTION}/${shopId}/messages`);
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: SupportMessage[] = snapshot.docs.map((d) => {
        const data = d.data() as any;
        const senderType: SupportMessage['senderType'] =
          data.senderType ||
          (data.senderRole === 'platform_admin' ? 'admin' : 'customer');
        return {
          id: d.id,
          conversationId: data.conversationId || shopId,
          shopId: data.shopId || shopId,
          senderUid: data.senderUid,
          senderEmail: data.senderEmail,
          senderRole: data.senderRole,
          senderType,
          senderName: data.senderName || (senderType === 'admin' ? 'Support Team' : 'Shop Owner'),
          messageText: data.messageText || '',
          timestamp: Number(data.timestamp) || Date.now(),
          clientMessageId: data.clientMessageId,
          deliveryStatus: 'sent',
        };
      });
      onUpdate(list);
    },
    (err) => {
      console.error('Error listening to support messages:', err);
      onError?.(
        new Error(
          err?.code === 'permission-denied'
            ? 'Access denied loading chat history. Please verify your sign-in session.'
            : err?.message || 'Unable to sync support chat messages.'
        )
      );
    }
  );
}

/**
 * Sends an authenticated customer message to the Admin Inbox, deriving sender UID/email
 * strictly from Firebase Auth and deduplicating concurrent in-flight submissions.
 */
export async function sendCustomerMessage(
  shopId: string,
  ownerName: string,
  _ownerEmail: string,
  shopName: string,
  text: string,
  clientMessageId?: string
): Promise<SupportMessage> {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Cannot send an empty message.');
  }

  const activeUser = auth.currentUser;
  if (!activeUser) {
    throw new Error('Authentication required. Please log in again before sending messages.');
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You appear to be offline. Connect to the internet to deliver messages.');
  }

  const resolvedClientMsgId = clientMessageId || generateClientMessageId();
  const existingInFlight = inFlightSends.get(resolvedClientMsgId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const authenticatedUid = activeUser.uid;
  const authenticatedEmail = activeUser.email || '';
  const resolvedShopId = shopId || `shop_${authenticatedUid}`;
  const resolvedOwnerName = ownerName?.trim() || activeUser.displayName || authenticatedEmail || 'Shop Owner';
  const resolvedShopName = shopName?.trim() || `${resolvedOwnerName}'s Pawn Shop`;

  const sendPromise = (async (): Promise<SupportMessage> => {
    const convRef = doc(db, CONVERSATIONS_COLLECTION, resolvedShopId);
    const now = Date.now();

    const executeWrite = async (): Promise<SupportMessage> => {
      await setDoc(
        convRef,
        {
          shopId: resolvedShopId,
          ownerUid: authenticatedUid,
          ownerName: resolvedOwnerName,
          ownerEmail: authenticatedEmail,
          shopName: resolvedShopName,
          lastMessage: cleanText,
          lastUpdated: now,
          lastMessageAt: now,
          lastSenderRole: 'shop_owner',
          status: 'open',
          serverUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const msgRef = collection(db, `${CONVERSATIONS_COLLECTION}/${resolvedShopId}/messages`);
      const docRef = await addDoc(msgRef, {
        conversationId: resolvedShopId,
        shopId: resolvedShopId,
        senderUid: authenticatedUid,
        senderEmail: authenticatedEmail,
        senderRole: 'shop_owner',
        senderType: 'customer',
        senderName: resolvedOwnerName,
        messageText: cleanText,
        clientMessageId: resolvedClientMsgId,
        timestamp: now,
        serverTimestamp: serverTimestamp(),
      });

      return {
        id: docRef.id,
        conversationId: resolvedShopId,
        shopId: resolvedShopId,
        senderUid: authenticatedUid,
        senderEmail: authenticatedEmail,
        senderRole: 'shop_owner',
        senderType: 'customer',
        senderName: resolvedOwnerName,
        messageText: cleanText,
        timestamp: now,
        clientMessageId: resolvedClientMsgId,
        deliveryStatus: 'sent',
      };
    };

    try {
      return await withTimeout(
        executeWrite(),
        SEND_TIMEOUT_MS,
        'Message delivery timed out. Please check your connection and retry.'
      );
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        throw new Error('Permission denied delivering support message. Please log out and sign in again.');
      }
      throw new Error(err?.message || 'Failed to deliver support message.');
    }
  })();

  inFlightSends.set(resolvedClientMsgId, sendPromise);
  try {
    return await sendPromise;
  } finally {
    inFlightSends.delete(resolvedClientMsgId);
  }
}

export interface AIChatContext {
  shopName?: string;
  ownerName?: string;
  plan?: string;
  activeDevices?: number;
  maxDevices?: number;
}

export interface AIChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

/**
 * 'AI Care Plus' Customer Support powered by Gemini through secure serverless backend
 * Ensures NO private financial customer records are ever sent to Gemini.
 */
export async function askGeminiCustomerCare(
  question: string,
  isPremium: boolean,
  context?: AIChatContext,
  history?: AIChatHistoryItem[]
): Promise<{ text: string; error?: string; persona?: string }> {
  if (!isPremium) {
    return {
      text: '',
      error: 'AI Care Plus is an exclusive feature of the Yearly Premium Plan.'
    };
  }

  try {
    const backendEndpoint =
      import.meta.env.VITE_BACKEND_GEMINI_ENDPOINT ||
      (import.meta.env.VITE_BACKEND_API_URL
        ? `${import.meta.env.VITE_BACKEND_API_URL.replace(/\/+$/, '')}/api/ask-gemini`
        : '/api/ask-gemini');

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
      body: JSON.stringify({ question, context, history })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.reply || data.text || 'How can I assist you further with your pawn shop operations?',
        persona: data.persona || 'AI Care Plus'
      };
    }

    const errData = await res.json().catch(() => ({}));
    const fallbackMessage = errData.error || 'AI Care Plus service is temporarily unavailable. Please try again shortly or contact Admin Care.';
    return { text: fallbackMessage, error: fallbackMessage };
  } catch (error: any) {
    return {
      text: 'AI Care Plus service is temporarily experiencing network delays. Our administrative support is available in Admin Care, or you can retry in a moment.',
      error: error?.message || 'Network request failed'
    };
  }
}
