# Database Collections & Schema Documentation

The data model uses Cloud Firestore with strict multi-tenant isolation keyed by `shopId`.

---

## 1. Collection: `shops`
Document ID: `shop_{ownerUid}`
- `shopId` (string, required): Unique shop identifier.
- `ownerUid` (string, required): Firebase Auth UID of the owner.
- `ownerName` (string, required): Full name of shop owner.
- `shopName` (string, required): Registered business name.
- `phone` (string, required): 10-digit mobile number.
- `address` (string, required): Physical shop address.
- `email` (string, required): Registered email address (lowercase).
- `createdAt` (number, ms timestamp)
- `updatedAt` (number, ms timestamp)

---

## 2. Collection: `users`
Document ID: `{uid}`
- `uid` (string, required): Firebase Auth UID.
- `shopId` (string, required): Target shop ID.
- `role` (string): `'owner'` or `'global_admin'`.
- `email` (string, required)

---

## 3. Collection: `settings`
Document ID: `{shopId}`
- `shopId` (string, required)
- `defaultInterestDuration` (string): `'Daily' | 'Weekly' | 'Monthly' | 'Yearly'`
- `defaultGoldPercentage` (number): e.g. `2.0`
- `defaultSilverPercentage` (number): e.g. `3.0`
- `defaultOthersPercentage` (number): e.g. `4.0`
- `updatedAt` (number)

---

## 4. Collection: `parties`
Document ID: Auto-generated Firestore ID
- `id` (string): Firestore ID.
- `shopId` (string, required): Strict tenant isolation key.
- `name` (string, required): Borrower full name.
- `phone` (string, required): 10-digit phone number.
- `address` (string, required): Residential address.
- `photoUrl` (string, optional): Collateral or customer photo URL.
- `totalBills` (number): Count of pledge bills under this customer.
- `createdAt` (number, ms timestamp)
- `updatedAt` (number, ms timestamp)

---

## 5. Collection: `bills`
Document ID: Auto-generated Firestore ID
- `id` (string): Firestore ID.
- `shopId` (string, required): Strict tenant isolation key.
- `billNumber` (string, required): Human-readable serial (e.g. `B-1001`).
- `partyId` (string, required): Reference to `parties` document.
- `partyName` (string, required)
- `partyPhone` (string, required)
- `itemCategory` (string, required): `'Gold' | 'Silver' | 'Others'`
- `itemDescription` (string, required): e.g. `22K Gold Chain with Pendant`
- `purity` (string): e.g. `916 / 22K`, `92.5%`
- `grossWeight` (number, required)
- `netWeight` (number, required)
- `weightUnit` (string, required): `'g' | 'mg' | 'tola' | 'pavan'`
- `principalPaise` (number, required): Integer paise (e.g. `5000000` = ₹50,000).
- `currentPrincipalPaise` (number, required): Outstanding principal balance.
- `interestPercentage` (number, required): e.g. `2.0`
- `interestDuration` (string, required): `'Daily' | 'Weekly' | 'Monthly' | 'Yearly'`
- `billDate` (string, YYYY-MM-DD): Interest starts strictly from this date.
- `dueDate` (string, optional, YYYY-MM-DD)
- `status` (string, required): `'Active' | 'Closed'`
- `totalPaidPaise` (number): Total money paid towards this bill.
- `totalInterestPaidPaise` (number): Total interest accrued and settled.
- `lastPaymentDate` (string, optional)
- `closedAt` (number, optional)
- `closingNotes` (string, optional)
- `createdAt` (number, ms timestamp)
- `updatedAt` (number, ms timestamp)

---

## 6. Collection: `payments`
Document ID: Auto-generated Firestore ID
- `id` (string): Firestore ID.
- `shopId` (string, required)
- `partyId` (string, required)
- `partyName` (string, required)
- `billId` (string, required)
- `billNumber` (string, required)
- `amountPaise` (number, required): Total payment received in integer paise.
- `interestPortionPaise` (number, required): Allocated to accrued interest.
- `principalPortionPaise` (number, required): Allocated to reducing principal.
- `paymentDate` (string, YYYY-MM-DD)
- `paymentMode` (string): `'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'`
- `notes` (string, optional)
- `createdAt` (number, ms timestamp)

---

## 7. Collection: `closing_bills`
Document ID: Auto-generated Firestore ID
- `id` (string): Firestore ID.
- `shopId` (string, required)
- `partyId` (string, required)
- `partyName` (string, required)
- `partyPhone` (string, required)
- `billId` (string, required)
- `billNumber` (string, required)
- `initialPrincipalPaise` (number, required)
- `outstandingPrincipalPaise` (number, required)
- `accruedInterestPaise` (number, required)
- `finalSettlementAmountPaise` (number, required)
- `closingDate` (string, YYYY-MM-DD)
- `paymentMode` (string)
- `notes` (string, optional)
- `closedAt` (number, ms timestamp)

---

## 8. Collection: `subscriptions`
Document ID: `{shopId}`
- `id` (string)
- `shopId` (string, required)
- `plan` (string): `'Yearly' | 'Yearly Premium'`
- `amountPaise` (number): `199900` or `299900`
- `startDate` (number, ms timestamp)
- `expiryDate` (number, ms timestamp)
- `status` (string): `'Approved' | 'Pending' | 'Failed' | 'Expired'`
- `maxDevices` (number): `3` (Yearly) or `9` (Yearly Premium)
- `activeDeviceIds` (array of strings)
- `razorpayOrderId` (string, optional)
- `razorpayPaymentId` (string, optional)
- `approvedAt` (number)

---

## 9. Sub-Collection: `support_conversations/{shopId}/messages`
- `id` (string)
- `conversationId` (string, equals `shopId`)
- `shopId` (string)
- `senderType` (string): `'customer' | 'admin' | 'ai'`
- `senderName` (string)
- `messageText` (string)
- `timestamp` (number, ms timestamp)
