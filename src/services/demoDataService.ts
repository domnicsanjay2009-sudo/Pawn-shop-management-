import { Party, Bill, Payment, ClosingBill } from '../types';

/**
 * Isolated In-Memory State for Demo Mode
 * Guaranteed to never persist to Firestore or survive session reload
 */
class DemoStore {
  private parties: Party[] = [];
  private bills: Bill[] = [];
  private payments: Payment[] = [];
  private closingBills: ClosingBill[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fifteenDaysAgo = new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Sample initial demo customers
    this.parties = [
      {
        id: 'demo_party_1',
        shopId: 'demo_shop',
        name: 'Rajesh Kumar',
        phone: '9876543210',
        address: '14, Gandhi Bazar, Main Street',
        totalBills: 2,
        createdAt: now - 35 * 24 * 60 * 60 * 1000,
        updatedAt: now - 35 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'demo_party_2',
        shopId: 'demo_shop',
        name: 'Anita Sharma',
        phone: '9845123456',
        address: '56, Temple Road, Cross 2',
        totalBills: 1,
        createdAt: now - 20 * 24 * 60 * 60 * 1000,
        updatedAt: now - 20 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'demo_party_3',
        shopId: 'demo_shop',
        name: 'Vikram Singh',
        phone: '9731234567',
        address: '88, Ring Road, Industrial Area',
        totalBills: 1,
        createdAt: now - 18 * 24 * 60 * 60 * 1000,
        updatedAt: now - 18 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'demo_party_4',
        shopId: 'demo_shop',
        name: 'Pooja Patel',
        phone: '9912345678',
        address: '102, Lakeview Enclave',
        totalBills: 1,
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
        updatedAt: now - 10 * 24 * 60 * 60 * 1000,
      }
    ];

    // Sample initial demo bills
    this.bills = [
      {
        id: 'demo_bill_1042',
        shopId: 'demo_shop',
        billNumber: 'B-1042',
        partyId: 'demo_party_1',
        partyName: 'Rajesh Kumar',
        partyPhone: '9876543210',
        itemCategory: 'Gold',
        itemDescription: '22K Traditional Gold Chain with Locket',
        purity: '22K / 916',
        grossWeight: 24.5,
        netWeight: 24.0,
        weightUnit: 'g',
        principalPaise: 11500000, // ₹1,15,000
        currentPrincipalPaise: 11500000,
        interestPercentage: 2.0,
        interestDuration: 'Monthly',
        billDate: thirtyDaysAgo,
        status: 'Active',
        totalPaidPaise: 0,
        totalInterestPaidPaise: 0,
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        updatedAt: now - 30 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'demo_bill_1043',
        shopId: 'demo_shop',
        billNumber: 'B-1043',
        partyId: 'demo_party_2',
        partyName: 'Anita Sharma',
        partyPhone: '9845123456',
        itemCategory: 'Others',
        itemDescription: 'Certified Solitaire Diamond Ring in Platinum Mount',
        purity: 'VVS1',
        grossWeight: 6.2,
        netWeight: 5.8,
        weightUnit: 'g',
        principalPaise: 4500000, // ₹45,000
        currentPrincipalPaise: 4500000,
        interestPercentage: 3.5,
        interestDuration: 'Monthly',
        billDate: fifteenDaysAgo,
        status: 'Active',
        totalPaidPaise: 0,
        totalInterestPaidPaise: 0,
        createdAt: now - 15 * 24 * 60 * 60 * 1000,
        updatedAt: now - 15 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'demo_bill_1044',
        shopId: 'demo_shop',
        billNumber: 'B-1044',
        partyId: 'demo_party_3',
        partyName: 'Vikram Singh',
        partyPhone: '9731234567',
        itemCategory: 'Silver',
        itemDescription: 'Sterling Silver Pair Anklets (Handcrafted)',
        purity: '92.5%',
        grossWeight: 200,
        netWeight: 198,
        weightUnit: 'g',
        principalPaise: 1250000, // ₹12,500
        currentPrincipalPaise: 1250000,
        interestPercentage: 3.0,
        interestDuration: 'Monthly',
        billDate: fifteenDaysAgo,
        status: 'Active',
        totalPaidPaise: 0,
        totalInterestPaidPaise: 0,
        createdAt: now - 15 * 24 * 60 * 60 * 1000,
        updatedAt: now - 15 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'demo_bill_1045',
        shopId: 'demo_shop',
        billNumber: 'B-1045',
        partyId: 'demo_party_4',
        partyName: 'Pooja Patel',
        partyPhone: '9912345678',
        itemCategory: 'Gold',
        itemDescription: '22K Gold Antique Kangan Bangles (Pair)',
        purity: '916 Hallmark',
        grossWeight: 31.0,
        netWeight: 30.5,
        weightUnit: 'g',
        principalPaise: 14000000, // ₹1,40,000
        currentPrincipalPaise: 14000000,
        interestPercentage: 2.0,
        interestDuration: 'Monthly',
        billDate: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Active',
        totalPaidPaise: 0,
        totalInterestPaidPaise: 0,
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
        updatedAt: now - 10 * 24 * 60 * 60 * 1000,
      }
    ];

    this.payments = [];
    this.closingBills = [];
  }

  public getParties(): Party[] {
    return [...this.parties];
  }

  public addParty(party: Omit<Party, 'id' | 'createdAt' | 'updatedAt' | 'totalBills'>): Party {
    const newP: Party = {
      ...party,
      id: `demo_p_${Date.now()}`,
      totalBills: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.parties.unshift(newP);
    return newP;
  }

  public getBills(): Bill[] {
    return [...this.bills];
  }

  public addBill(bill: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'billNumber' | 'totalPaidPaise' | 'totalInterestPaidPaise'>): Bill {
    const count = this.bills.length + 1;
    const newB: Bill = {
      ...bill,
      id: `demo_b_${Date.now()}`,
      billNumber: `B-${1045 + count}`,
      totalPaidPaise: 0,
      totalInterestPaidPaise: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.bills.unshift(newB);

    // Update party bill count
    const party = this.parties.find(p => p.id === bill.partyId);
    if (party) party.totalBills++;

    return newB;
  }

  public getPayments(): Payment[] {
    return [...this.payments];
  }

  public addPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Payment {
    const newPay: Payment = {
      ...payment,
      id: `demo_pay_${Date.now()}`,
      createdAt: Date.now(),
    };
    this.payments.unshift(newPay);

    // update bill
    const bill = this.bills.find(b => b.id === payment.billId);
    if (bill) {
      bill.currentPrincipalPaise = Math.max(0, bill.currentPrincipalPaise - payment.principalPortionPaise);
      bill.totalPaidPaise += payment.amountPaise;
      bill.totalInterestPaidPaise += payment.interestPortionPaise;
      bill.lastPaymentDate = payment.paymentDate;
      bill.updatedAt = Date.now();
    }

    return newPay;
  }

  public getClosingBills(): ClosingBill[] {
    return [...this.closingBills];
  }

  public closeBill(closing: Omit<ClosingBill, 'id' | 'closedAt'>): ClosingBill {
    const newClose: ClosingBill = {
      ...closing,
      id: `demo_close_${Date.now()}`,
      closedAt: Date.now(),
    };
    this.closingBills.unshift(newClose);

    const bill = this.bills.find(b => b.id === closing.billId);
    if (bill) {
      bill.status = 'Closed';
      bill.currentPrincipalPaise = 0;
      bill.closedAt = Date.now();
      bill.closedBy = closing.closedBy;
      bill.closedByUid = closing.closedByUid;
      bill.closingTransactionId = closing.closingTransactionId;
      bill.closingNotes = closing.notes;
      bill.updatedAt = Date.now();
    }

    return newClose;
  }
}

export const demoStore = new DemoStore();
