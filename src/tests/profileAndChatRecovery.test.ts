import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDoc = vi.fn((...args: any[]) => ({ path: args.slice(1).join('/') }));
const mockCollection = vi.fn((...args: any[]) => ({ path: args.slice(1).join('/') }));
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockQuery = vi.fn((...args: any[]) => args[0]);
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();

const mockState: {
  currentUser: { uid: string; email: string; displayName?: string } | null;
} = {
  currentUser: null,
};

vi.mock('../services/firebase', () => ({
  db: { __mockDb: true },
  authPersistenceReady: Promise.resolve(),
  auth: {
    get currentUser() {
      return mockState.currentUser;
    },
  },
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  reload: vi.fn(),
  applyActionCode: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  limit: (...args: any[]) => mockLimit(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
}));

import { getShopProfile, updateShopProfile } from '../services/authService';
import { sendCustomerMessage } from '../services/chatService';

describe('Shop Profile Recovery, Profile Updates, and Authenticated Chat Delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.currentUser = null;
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: 'msg_doc_123' });
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
  });

  it('recovers shop profile via deterministic shop_${uid} when users/{uid} mapping is missing', async () => {
    const uid = 'user_abc';
    const existingShop = {
      shopId: `shop_${uid}`,
      ownerUid: uid,
      ownerName: 'Ramesh',
      shopName: 'Ramesh Jewellery & Pawn',
      phone: '9876543210',
      address: 'MG Road',
      email: 'ramesh@example.com',
      createdAt: 1000,
      updatedAt: 1000,
    };

    mockGetDoc.mockImplementation(async (ref: { path: string }) => {
      if (ref.path === `users/${uid}`) {
        return { exists: () => false };
      }
      if (ref.path === `shops/shop_${uid}`) {
        return { exists: () => true, data: () => existingShop };
      }
      return { exists: () => false };
    });

    const profile = await getShopProfile(uid, { uid, email: 'ramesh@example.com' } as any);
    expect(profile).toEqual(existingShop);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `users/${uid}` }),
      expect.objectContaining({ shopId: `shop_${uid}`, uid }),
      { merge: true }
    );
  });

  it('auto-provisions missing shop profile for authenticated Firebase Auth users instead of returning null', async () => {
    const uid = 'legacy_uid_99';
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const profile = await getShopProfile(uid, {
      uid,
      email: 'owner@testshop.in',
      displayName: 'Test Owner',
    } as any);

    expect(profile).not.toBeNull();
    expect(profile?.shopId).toBe(`shop_${uid}`);
    expect(profile?.email).toBe('owner@testshop.in');
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `shops/shop_${uid}` }),
      expect.objectContaining({ ownerUid: uid, email: 'owner@testshop.in' })
    );
  });

  it('updates editable shop profile fields including logoUrl without overwriting unrelated fields', async () => {
    const updatedShop = {
      shopId: 'shop_1',
      ownerUid: 'u_1',
      ownerName: 'Suresh Verma',
      shopName: 'Suresh Gold Loan',
      phone: '9123456789',
      address: 'Main Bazaar',
      email: 'suresh@pawn.in',
      logoUrl: 'data:image/png;base64,ABC',
      status: 'Approved',
      createdAt: 100,
      updatedAt: 200,
    };

    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => updatedShop });

    const result = await updateShopProfile('shop_1', {
      shopName: '  Suresh Gold Loan ',
      ownerName: ' Suresh Verma ',
      phone: '9123456789',
      email: 'SURESH@PAWN.IN ',
      address: ' Main Bazaar ',
      logoUrl: 'data:image/png;base64,ABC',
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'shops/shop_1' }),
      expect.objectContaining({
        shopName: 'Suresh Gold Loan',
        ownerName: 'Suresh Verma',
        phone: '9123456789',
        email: 'suresh@pawn.in',
        address: 'Main Bazaar',
        logoUrl: 'data:image/png;base64,ABC',
      })
    );
    expect(result.status).toBe('Approved');
    expect(result.logoUrl).toBe('data:image/png;base64,ABC');
  });

  it('enforces authenticated Firebase user email/UID on support chat messages and deduplicates concurrent sends', async () => {
    await expect(
      sendCustomerMessage('shop_1', 'Fake Name', 'spoofed@evil.com', 'Shop', 'Hello')
    ).rejects.toThrow('Authentication required');

    mockState.currentUser = {
      uid: 'real_uid_1',
      email: 'verifiedowner@shop.com',
      displayName: 'Verified Owner',
    };

    const p1 = sendCustomerMessage(
      'shop_real_uid_1',
      'Verified Owner',
      'spoofed@evil.com',
      'Royal Pawn Shop',
      'Need billing help',
      'client_msg_dedup_1'
    );
    const p2 = sendCustomerMessage(
      'shop_real_uid_1',
      'Verified Owner',
      'spoofed@evil.com',
      'Royal Pawn Shop',
      'Need billing help',
      'client_msg_dedup_1'
    );

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1.id).toBe('msg_doc_123');
    expect(res2.id).toBe('msg_doc_123');
    expect(res1.senderEmail).toBe('verifiedowner@shop.com');
    expect(res1.senderUid).toBe('real_uid_1');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'support_conversations/shop_real_uid_1' }),
      expect.objectContaining({
        ownerUid: 'real_uid_1',
        ownerEmail: 'verifiedowner@shop.com',
        lastMessage: 'Need billing help',
        lastSenderRole: 'shop_owner',
      }),
      { merge: true }
    );
  });
});
