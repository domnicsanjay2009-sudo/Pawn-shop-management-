import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { Bill, ItemCategory, InterestDuration, WeightUnit } from '../types';
import { incrementPartyBillCount } from './partyService';

const BILLS_COLLECTION = 'bills';

export interface CreateBillInput {
  partyId: string;
  partyName: string;
  partyPhone: string;
  itemCategory: ItemCategory;
  itemDescription: string;
  purity?: string;
  grossWeight: number;
  netWeight: number;
  weightUnit: WeightUnit;
  itemPhotoUrl?: string;
  principalPaise: number;
  interestPercentage: number;
  interestDuration: InterestDuration;
  billDate: string; // YYYY-MM-DD
  dueDate?: string;
}

export async function generateNextBillNumber(shopId: string): Promise<string> {
  try {
    const q = query(
      collection(db, BILLS_COLLECTION),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    let maxNumber = 1000;
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const numStr = data.billNumber;
      if (typeof numStr === 'string' && numStr.startsWith('B-')) {
        const val = parseInt(numStr.replace('B-', ''), 10);
        if (!isNaN(val) && val > maxNumber) {
          maxNumber = val;
        }
      }
    });
    return `B-${maxNumber + 1}`;
  } catch (error) {
    return `B-${1000 + Math.floor(Math.random() * 9000)}`;
  }
}

export async function createBill(shopId: string, input: CreateBillInput): Promise<Bill> {
  const billNumber = await generateNextBillNumber(shopId);
  const now = Date.now();

  const newBillData = {
    shopId,
    billNumber,
    partyId: input.partyId,
    partyName: input.partyName,
    partyPhone: input.partyPhone,
    itemCategory: input.itemCategory,
    itemDescription: input.itemDescription.trim(),
    purity: input.purity?.trim() || '',
    grossWeight: Number(input.grossWeight) || 0,
    netWeight: Number(input.netWeight) || 0,
    weightUnit: input.weightUnit,
    itemPhotoUrl: input.itemPhotoUrl || '',
    principalPaise: input.principalPaise,
    currentPrincipalPaise: input.principalPaise,
    interestPercentage: input.interestPercentage,
    interestDuration: input.interestDuration,
    billDate: input.billDate,
    dueDate: input.dueDate || '',
    status: 'Active' as const,
    totalPaidPaise: 0,
    totalInterestPaidPaise: 0,
    createdAt: now,
    updatedAt: now,
    serverCreatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, BILLS_COLLECTION), newBillData);
  await incrementPartyBillCount(input.partyId);

  return {
    id: docRef.id,
    ...newBillData,
  };
}

export async function getBillsForParty(shopId: string, partyId: string): Promise<Bill[]> {
  try {
    const q = query(
      collection(db, BILLS_COLLECTION),
      where('shopId', '==', shopId),
      where('partyId', '==', partyId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill));
  } catch (e) {
    console.error('Error fetching bills for party:', e);
    return [];
  }
}

export async function getAllBills(shopId: string): Promise<Bill[]> {
  try {
    const q = query(
      collection(db, BILLS_COLLECTION),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill));
  } catch (e) {
    console.error('Error fetching all bills:', e);
    return [];
  }
}

export async function getBillById(shopId: string, billId: string): Promise<Bill | null> {
  try {
    const ref = doc(db, BILLS_COLLECTION, billId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Omit<Bill, 'id'>;
    if ((data as any).shopId !== shopId) return null; // isolation
    return { id: snap.id, ...data };
  } catch (e) {
    console.error('Error fetching bill:', e);
    return null;
  }
}
