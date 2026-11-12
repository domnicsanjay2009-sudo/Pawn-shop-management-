// Data Model Specifications for Pawn Shop Management Main App & Admin Panel

export type InterestDuration = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
export type ItemCategory = 'Gold' | 'Silver' | 'Others';
export type WeightUnit = 'g' | 'mg' | 'tola' | 'pavan';
export type BillStatus = 'Active' | 'Closed';
export type PlanType = 'Yearly' | 'Yearly Premium' | 'Complimentary Premium' | 'Free';
export type SubscriptionStatus = 'Approved' | 'Pending' | 'Failed' | 'Expired' | 'Cancelled' | 'Revoked';
export type EntitlementSource = 'RAZORPAY' | 'ADMIN_GRANTED' | 'COMPLIMENTARY' | 'SYSTEM';
export type PaymentStatus = 'PAID' | 'UNPAID' | 'COMPLIMENTARY' | 'REFUNDED' | 'FAILED';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Cheque';

export interface ShopProfile {
  shopId: string;
  ownerUid: string;
  ownerName: string;
  shopName: string;
  phone: string; // 10 digits
  address: string;
  email: string;
  status?: 'Pending' | 'Approved' | 'Disabled' | 'Blocked' | 'Suspended' | 'Rejected';
  isSuspended?: boolean;
  isBlocked?: boolean;
  isApproved?: boolean;
  suspensionReason?: string;
  disabledReason?: string;
  blockedReason?: string;
  createdAt: number; // UTC ms or Firestore Timestamp
  updatedAt: number;
}

export interface AppSettings {
  shopId: string;
  defaultInterestDuration: InterestDuration;
  defaultGoldPercentage: number;
  defaultSilverPercentage: number;
  defaultOthersPercentage: number;
  updatedAt: number;
}

export interface Party {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  address: string;
  photoUrl?: string;
  totalBills: number;
  createdAt: number;
  updatedAt: number;
}

export interface Bill {
  id: string;
  shopId: string;
  billNumber: string; // e.g. PSM-1001
  partyId: string;
  partyName: string;
  partyPhone: string;
  
  // Collateral Details
  itemCategory: ItemCategory;
  itemDescription: string;
  purity?: string; // e.g. 22K, 916
  grossWeight: number; // in specified unit
  netWeight: number;
  weightUnit: WeightUnit; // g, mg, tola, pavan
  itemPhotoUrl?: string;
  
  // Financial Terms
  principalPaise: number; // exact integer paise
  currentPrincipalPaise: number; // remaining principal balance in paise
  interestPercentage: number; // e.g. 2.0%
  interestDuration: InterestDuration; // Daily, Weekly, Monthly, Yearly
  billDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  status: BillStatus; // Active | Closed
  
  // Summary Aggregates
  totalPaidPaise: number;
  totalInterestPaidPaise: number;
  lastPaymentDate?: string;
  closedAt?: number;
  closingNotes?: string;
  
  createdAt: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  shopId: string;
  partyId: string;
  partyName: string;
  billId: string;
  billNumber: string;
  amountPaise: number; // exact amount paid
  interestPortionPaise: number; // portion settling accrued interest
  principalPortionPaise: number; // portion reducing principal
  paymentDate: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  notes?: string;
  createdAt: number;
}

export interface ClosingBill {
  id: string;
  shopId: string;
  billId: string;
  billNumber: string;
  partyId: string;
  partyName: string;
  partyPhone: string;
  
  // Final Financial Reconciliation
  initialPrincipalPaise: number;
  outstandingPrincipalPaise: number;
  accruedInterestPaise: number;
  finalSettlementAmountPaise: number;
  
  closingDate: string;
  paymentMode: PaymentMode;
  notes?: string;
  closedAt: number;
}

export interface Subscription {
  id: string;
  shopId: string;
  plan: PlanType;
  amountPaise: number;
  startDate: number;
  expiryDate: number;
  status: SubscriptionStatus;
  maxDevices: number;
  activeDeviceIds: string[];
  entitlementSource?: EntitlementSource;
  paymentStatus?: PaymentStatus;
  approvalType?: 'razorpay_webhook' | 'manual_admin';
  approvedBy?: string;
  note?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentMethod?: string;
  currency?: string;
  approvedAt?: number;
  updatedAt?: number;
  createdAt: number;
}

export interface StaffPass {
  id: string;
  shopId: string;
  staffName: string;
  token: string;
  issuedAt: number;
  expiresAt: number; // 90 days from issuedAt
  isActive: boolean;
  assignedDeviceId?: string;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  shopId: string;
  senderType: 'customer' | 'admin' | 'ai';
  senderName: string;
  messageText: string;
  timestamp: number;
}

export interface SupportConversation {
  id: string;
  shopId: string;
  shopName: string;
  ownerName: string;
  ownerEmail: string;
  lastMessage: string;
  lastUpdated: number;
  status: 'open' | 'resolved';
}

export interface AuditLog {
  id: string;
  shopId: string;
  action: string;
  details: Record<string, any>;
  performedBy: string;
  timestamp: number;
}

export interface AppLockConfig {
  type: 'pin' | 'password' | 'none';
  hash: string;
  biometricEnabled: boolean;
  lastActive: number;
}

// ----------------------------------------------------------------------------
// COMPANION ADMIN PANEL & DEVICE REGISTRY DATA MODELS
// ----------------------------------------------------------------------------

export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type DeviceStatus = 'active' | 'revoked' | 'inactive';
export type SessionStatus = 'online' | 'offline' | 'expired' | 'revoked';

export interface UserDevice {
  id: string; // `dev_${user_uid}_${device_id}` or device_id
  device_id: string;
  user_uid: string;
  shop_id: string;
  owner_email: string;
  owner_name: string;
  shop_name: string;
  device_name: string;
  device_type: DeviceType;
  browser: string;
  operating_system: string;
  first_seen_at: number;
  last_seen_at: number;
  device_status: DeviceStatus;
  total_sessions: number;
  revoked_at?: number | null;
  revoked_by?: string | null;
  revocation_reason?: string | null;
  schema_version: number;
}

export interface UserSession {
  session_id: string; // `sess_${uuid}`
  user_uid: string;
  email_snapshot: string;
  owner_name: string;
  shop_id: string;
  shop_name: string;
  device_id: string;
  device_name: string;
  device_type: DeviceType;
  browser: string;
  operating_system: string;
  ip_info: string;
  login_at: number;
  last_heartbeat_at: number;
  logout_at?: number | null;
  expires_at: number;
  session_status: SessionStatus;
  created_at: number;
}

export type LoginResultType =
  | 'Successful Login'
  | 'Failed Login'
  | 'Session Revoked'
  | 'Session Expired'
  | 'Administrator Terminated Session';

export interface DeviceActivityLog {
  event_id: string; // `act_${uuid}`
  user_uid: string;
  email: string;
  owner_name?: string;
  shop_id: string;
  shop_name?: string;
  device_id: string;
  device_name?: string;
  device_type?: DeviceType;
  operating_system?: string;
  browser?: string;
  ip_address?: string;
  session_id?: string;
  event_type: 'login' | 'logout' | 'heartbeat' | 'session_expired' | 'device_registered' | 'device_revoked' | 'suspicious_activity';
  event_result: 'success' | 'failure' | 'blocked' | LoginResultType;
  login_result?: LoginResultType;
  event_timestamp: number;
  recorded_at: number;
  actor_uid: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AdminAuditLog {
  id: string; // `aud_${uuid}`
  audit_id?: string;
  admin_uid: string;
  admin_email: string;
  target_user_uid?: string;
  target_user_email?: string;
  target_resource: string;
  target_id: string;
  action:
    | 'APPROVE_USER_PREMIUM'
    | 'APPROVE_USER'
    | 'DISABLE_USER'
    | 'REACTIVATE_USER'
    | 'BLOCK_USER'
    | 'UNBLOCK_USER'
    | 'GRANT_PREMIUM'
    | 'REVOKE_PREMIUM'
    | 'EXTEND_SUBSCRIPTION'
    | 'CHANGE_ENTITLEMENT'
    | 'REVOKE_DEVICE'
    | 'REVOKE_ALL_DEVICES'
    | 'OVERRIDE_SUBSCRIPTION';
  previous_status?: string;
  new_status?: string;
  previous_subscription?: string;
  new_subscription?: string;
  reason?: string;
  details?: Record<string, any>;
  timestamp: number;
  operation_result?: 'SUCCESS' | 'FAILURE';
  ip_address?: string;
}

export interface PlatformAdmin {
  uid: string;
  email: string;
  role: 'global_admin';
  createdAt: number;
  addedBy?: string;
}
