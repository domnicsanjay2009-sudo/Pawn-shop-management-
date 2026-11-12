import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Party } from '../types';

const PARTIES_COLLECTION = 'parties';

export async function addParty(
  shopId: string,
  partyData: { name: string; phone: string; address: string; photoUrl?: string }
): Promise<Party> {
  const newPartyData = {
    shopId,
    name: partyData.name.trim(),
    phone: partyData.phone.trim(),
    address: partyData.address.trim(),
    photoUrl: partyData.photoUrl || '',
    totalBills: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, PARTIES_COLLECTION), newPartyData);
  return {
    id: docRef.id,
    ...newPartyData,
  };
}

export async function getRecentParties(shopId: string, maxItems = 10): Promise<Party[]> {
  try {
    const q = query(
      collection(db, PARTIES_COLLECTION),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Party));
  } catch (error) {
    console.error('Error fetching recent parties:', error);
    return [];
  }
}

export async function getAllPartiesAlphabetical(shopId: string): Promise<Party[]> {
  try {
    const q = query(
      collection(db, PARTIES_COLLECTION),
      where('shopId', '==', shopId),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Party));
  } catch (error) {
    console.error('Error fetching parties alphabetically:', error);
    return [];
  }
}

export async function searchPartiesByName(shopId: string, searchTerm: string): Promise<Party[]> {
  const all = await getAllPartiesAlphabetical(shopId);
  const term = searchTerm.trim().toLowerCase();
  if (!term) return all;
  return all.filter(p => p.name.toLowerCase().includes(term));
}

export async function searchPartiesByPhone(shopId: string, phoneQuery: string): Promise<Party[]> {
  const all = await getAllPartiesAlphabetical(shopId);
  const term = phoneQuery.trim().replace(/[\s\-\+]/g, '');
  if (!term) return all;
  return all.filter(p => p.phone.replace(/[\s\-\+]/g, '').includes(term));
}

export async function getPartyById(shopId: string, partyId: string): Promise<Party | null> {
  try {
    const ref = doc(db, PARTIES_COLLECTION, partyId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Omit<Party, 'id'>;
    if ((data as any).shopId !== shopId) return null; // Enforce data isolation
    return { id: snap.id, ...data };
  } catch (error) {
    console.error('Error fetching party by ID:', error);
    return null;
  }
}

export async function incrementPartyBillCount(partyId: string): Promise<void> {
  try {
    const ref = doc(db, PARTIES_COLLECTION, partyId);
    await updateDoc(ref, {
      totalBills: increment(1),
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error('Error incrementing party bill count:', e);
  }
}
