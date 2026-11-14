import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { AppLockProvider, useAppLock } from './context/AppLockContext';
import { DemoProvider, useDemo } from './context/DemoContext';
import { ToastProvider, useToast } from './components/common/Toast';

import { WelcomeScreen } from './components/auth/WelcomeScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { CreateAccountScreen } from './components/auth/CreateAccountScreen';
import { ForgotPasswordScreen } from './components/auth/ForgotPasswordScreen';
import { EmailVerificationScreen } from './components/auth/EmailVerificationScreen';
import { AppLockScreen } from './components/auth/AppLockScreen';

import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardHome } from './components/home/DashboardHome';
import { BillsView } from './components/bills/BillsView';
import { PaymentsView } from './components/payments/PaymentsView';
import { ClosingBillsView } from './components/closing/ClosingBillsView';
import { ExpiredBillsView } from './components/expired/ExpiredBillsView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { AddPartyForm } from './components/parties/AddPartyForm';
import { PartyList } from './components/parties/PartyList';
import { PartyDetailView } from './components/parties/PartyDetailView';
import { AddBillForm } from './components/bills/AddBillForm';
import { AddPaymentModal } from './components/payments/AddPaymentModal';
import { CloseBillModal } from './components/closing/CloseBillModal';
import { EditBillModal } from './components/bills/EditBillModal';
import { EditPaymentModal } from './components/payments/EditPaymentModal';
import { EditClosingBillModal } from './components/closing/EditClosingBillModal';
import { BillReceiptModal } from './components/common/BillReceiptModal';
import { AppSettings } from './components/settings/AppSettings';
import { SubscriptionPlans } from './components/subscription/SubscriptionPlans';
import { SubscriptionPausedScreen } from './components/subscription/SubscriptionPausedScreen';
import { MoreVertical } from 'lucide-react';
import { republishExpiredBill } from './services/expiredBillService';

// Public legal & information pages for Razorpay verification & compliance
import { AboutUsPage } from './components/public/AboutUsPage';
import { ContactUsPage } from './components/public/ContactUsPage';
import { TermsAndConditionsPage } from './components/public/TermsAndConditionsPage';
import { RefundPolicyPage } from './components/public/RefundPolicyPage';
import { PrivacyPolicyPage } from './components/public/PrivacyPolicyPage';

import {
  Party,
  Bill,
  Payment,
  ClosingBill,
  AppSettings as IAppSettings
} from './types';
import {
  getAllPartiesAlphabetical,
  addParty
} from './services/partyService';
import {
  getAllBills,
  createBill
} from './services/billService';
import {
  getAllPayments,
  recordPayment
} from './services/paymentService';
import {
  getAllClosingBills,
  closeBill
} from './services/closingService';
import {
  getSettings,
  DEFAULT_APP_SETTINGS
} from './services/settingsService';

const MainApplication: React.FC = () => {
  const {
    currentUser,
    pendingVerificationUser,
    shopProfile,
    loading: authLoading,
    shouldShowLogin,
    consumeShouldShowLogin,
  } = useAuth();
  const { subscription, hasActivePlan } = useSubscription();
  const { isLocked } = useAppLock();
  const {
    isDemoMode,
    demoParties,
    demoBills,
    demoPayments,
    demoClosingBills,
    addDemoParty,
    addDemoBill,
    addDemoPayment,
    closeDemoBill,
    refreshDemoData
  } = useDemo();
  const { showToast } = useToast();

  // Navigation and view state
  const [authView, setAuthView] = useState<'welcome' | 'login' | 'register' | 'forgot'>('welcome');

  // Public routing state for Razorpay verification & direct page access
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.toLowerCase();
    }
    return '/';
  });

  const navigateTo = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.toLowerCase() !== path.toLowerCase()) {
        window.history.pushState({}, '', path);
      }
      setCurrentPath(path.toLowerCase());
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname.toLowerCase());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const normalizedPath = currentPath.endsWith('/') && currentPath.length > 1
    ? currentPath.slice(0, -1)
    : currentPath;

  useEffect(() => {
    if (normalizedPath === '/login') {
      setAuthView('login');
    } else if (normalizedPath === '/register') {
      setAuthView('register');
    } else if (normalizedPath === '/forgot-password' || normalizedPath === '/forgot') {
      setAuthView('forgot');
    }
  }, [normalizedPath]);

  useEffect(() => {
    if (shouldShowLogin) {
      setAuthView('login');
      consumeShouldShowLogin();
    }
  }, [shouldShowLogin, consumeShouldShowLogin]);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data state
  const [parties, setParties] = useState<Party[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [closingBills, setClosingBills] = useState<ClosingBill[]>([]);
  const [settings, setSettings] = useState<IAppSettings>(DEFAULT_APP_SETTINGS);
  const [dataLoading, setDataLoading] = useState(false);

  // Selected party for detail view
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [preselectedCustomerForBill, setPreselectedCustomerForBill] = useState<Party | null>(null);

  // Modals & Receipts
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showCloseBillModal, setShowCloseBillModal] = useState(false);
  const [modalParty, setModalParty] = useState<Party | null>(null);
  const [modalBill, setModalBill] = useState<Bill | null>(null);
  const [receiptBill, setReceiptBill] = useState<Bill | null>(null);
  const [receiptParty, setReceiptParty] = useState<Party | null>(null);
  const [receiptClosing, setReceiptClosing] = useState<ClosingBill | null>(null);

  // 3 Edit / Alter System States
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingClosingBill, setEditingClosingBill] = useState<ClosingBill | null>(null);

  const handleViewReceipt = (bill: Bill, party?: Party, closing?: ClosingBill) => {
    setReceiptBill(bill);
    setReceiptParty(party || activeParties.find((p) => p.id === bill.partyId) || null);
    setReceiptClosing(closing || activeClosingBills.find((c) => c.billId === bill.id) || null);
  };

  // Load real production data from Firestore
  const loadProductionData = useCallback(async () => {
    if (!shopProfile?.shopId) return;

    setDataLoading(true);
    try {
      const [pts, bls, pays, cls, setts] = await Promise.all([
        getAllPartiesAlphabetical(shopProfile.shopId),
        getAllBills(shopProfile.shopId),
        getAllPayments(shopProfile.shopId),
        getAllClosingBills(shopProfile.shopId),
        getSettings(shopProfile.shopId),
      ]);

      setParties(pts);
      setBills(bls);
      setPayments(pays);
      setClosingBills(cls);
      setSettings(setts);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setDataLoading(false);
    }
  }, [shopProfile?.shopId]);

  useEffect(() => {
    if (currentUser && shopProfile?.shopId && !isDemoMode) {
      loadProductionData();
    }
  }, [currentUser, shopProfile?.shopId, isDemoMode, loadProductionData]);

  // Current active data set (switches transparently between Demo Mode and Production)
  const activeParties = isDemoMode ? demoParties : parties;
  const activeBills = isDemoMode ? demoBills : bills;
  const activePayments = isDemoMode ? demoPayments : payments;
  const activeClosingBills = isDemoMode ? demoClosingBills : closingBills;

  // Handlers for data actions
  const handleSaveParty = async (data: any) => {
    if (isDemoMode) {
      const p = addDemoParty(data);
      showToast(`Party ${p.name} created (Demo Mode).`, 'success');
      return;
    }

    const targetShopId = shopProfile?.shopId || (currentUser ? `shop_${currentUser.uid}` : '');
    if (!targetShopId) {
      showToast('Shop profile unavailable. Please refresh and try again.', 'error');
      return;
    }
    const p = await addParty(targetShopId, data);
    setParties((prev) => [p, ...prev]);
    showToast(`Party ${p.name} added successfully.`, 'success');
  };

  const handleSaveBill = async (data: any) => {
    let savedBill: Bill | null = null;
    if (isDemoMode) {
      savedBill = addDemoBill(data);
      showToast(`Pledge Bill ${savedBill.billNumber} created (Demo Mode).`, 'success');
    } else {
      if (!shopProfile?.shopId) return;
      savedBill = await createBill(shopProfile.shopId, data);
      setBills((prev) => [savedBill!, ...prev]);
      // update party bill count
      setParties((prev) =>
        prev.map((p) => (p.id === data.partyId ? { ...p, totalBills: p.totalBills + 1 } : p))
      );
      showToast(`Bill ${savedBill.billNumber} created successfully.`, 'success');
    }

    // Auto-navigate back to the customer's detail view to inspect their new bill
    const associatedParty =
      activeParties.find((p) => p.id === data.partyId) ||
      preselectedCustomerForBill ||
      parties.find((p) => p.id === data.partyId);

    setPreselectedCustomerForBill(null);
    if (associatedParty) {
      setSelectedParty(associatedParty);
    }
  };

  const handleSavePayment = async (data: any) => {
    if (isDemoMode) {
      addDemoPayment(data);
      showToast('Payment recorded successfully (Demo Mode).', 'success');
      return;
    }

    if (!shopProfile?.shopId) return;
    const res = await recordPayment(shopProfile.shopId, data);
    if (res.success && res.payment) {
      setPayments((prev) => [res.payment!, ...prev]);
      // update local bill
      setBills((prev) =>
        prev.map((b) =>
          b.id === data.billId
            ? {
                ...b,
                currentPrincipalPaise: Math.max(
                  0,
                  b.currentPrincipalPaise - (res.payment?.principalPortionPaise || 0)
                ),
                totalPaidPaise: (b.totalPaidPaise || 0) + data.amountPaise,
                totalInterestPaidPaise:
                  (b.totalInterestPaidPaise || 0) + (res.payment?.interestPortionPaise || 0),
                lastPaymentDate: data.paymentDate,
              }
            : b
        )
      );
      showToast('Payment recorded and allocated successfully.', 'success');
    } else {
      showToast(res.error || 'Failed to record payment.', 'error');
    }
  };

  const handleCloseBill = async (data: any) => {
    if (isDemoMode) {
      const closingBill = closeDemoBill(data);
      setClosingBills((prev) => [closingBill, ...prev]);
      setBills((prev) =>
        prev.map((b) =>
          b.id === data.billId
            ? {
                ...b,
                status: 'Closed',
                currentPrincipalPaise: 0,
                closedAt: closingBill.closedAt,
                closedBy: closingBill.closedBy || data.closedBy,
                closedByUid: closingBill.closedByUid || data.closedByUid,
                closingTransactionId: closingBill.closingTransactionId || data.closingTransactionId,
                closingNotes: data.notes,
              }
            : b
        )
      );
      showToast('Bill settled and closed (Demo Mode).', 'success');
      return;
    }

    if (!shopProfile?.shopId) return;
    const res = await closeBill(shopProfile.shopId, data);
    if (res.success && res.closingBill) {
      setClosingBills((prev) => [res.closingBill!, ...prev]);
      setBills((prev) =>
        prev.map((b) =>
          b.id === data.billId
            ? {
                ...b,
                status: 'Closed',
                currentPrincipalPaise: 0,
                closedAt: res.closingBill?.closedAt || Date.now(),
                closedBy: res.closingBill?.closedBy || data.closedBy,
                closedByUid: res.closingBill?.closedByUid || data.closedByUid,
                closingTransactionId: res.closingBill?.closingTransactionId || data.closingTransactionId,
                closingNotes: data.notes,
              }
            : b
        )
      );
      showToast('Bill successfully settled and closed.', 'success');
    } else {
      showToast(res.error || 'Failed to close bill.', 'error');
    }
  };

  const handleRepublishBill = async (bill: Bill) => {
    if (!shopProfile?.shopId) return;
    try {
      const actorName = shopProfile.ownerName || currentUser?.displayName || 'Authorized User';
      const actorUid = currentUser?.uid;
      const updated = await republishExpiredBill(shopProfile.shopId, bill, settings, actorName, actorUid);
      setBills((prev) => prev.map((b) => (b.id === bill.id ? updated : b)));
      showToast(`Bill ${bill.billNumber} successfully republished and returned to active ledger.`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to republish bill.', 'error');
    }
  };

  const handleOpenAddBillFromHome = () => {
    setPreselectedCustomerForBill(null);
    setSelectedParty(null);
    setCurrentTab('bills');
  };

  const handleOpenAddPaymentFromHome = () => {
    setModalParty(null);
    setModalBill(null);
    setShowAddPaymentModal(true);
  };

  const handleOpenAddClosingFromHome = () => {
    setModalParty(null);
    setModalBill(null);
    setShowCloseBillModal(true);
  };

  const handleSaveEditedBill = async (updatedBill: Bill) => {
    setBills((prev) => prev.map((b) => (b.id === updatedBill.id ? updatedBill : b)));
    if (!isDemoMode && shopProfile?.shopId) {
      await loadProductionData();
    }
    showToast(`Bill ${updatedBill.billNumber} altered and financial history recalculated.`, 'success');
  };

  const handleSaveEditedPayment = async (updatedPayment: Payment) => {
    setPayments((prev) => prev.map((p) => (p.id === updatedPayment.id ? updatedPayment : p)));
    if (!isDemoMode && shopProfile?.shopId) {
      await loadProductionData();
    }
    showToast('Payment altered and financial balance recalculated.', 'success');
  };

  const handleSaveEditedClosingBill = async (updatedClosing: ClosingBill) => {
    setClosingBills((prev) => prev.map((c) => (c.id === updatedClosing.id ? updatedClosing : c)));
    if (!isDemoMode && shopProfile?.shopId) {
      await loadProductionData();
    }
    showToast('Closing settlement altered and linked records synchronized.', 'success');
  };

  // Public Pages (accessible without login, on direct URL, and after browser refresh)
  if (normalizedPath === '/about-us') {
    return <AboutUsPage onNavigate={navigateTo} />;
  }
  if (normalizedPath === '/contact-us') {
    return <ContactUsPage onNavigate={navigateTo} />;
  }
  if (normalizedPath === '/terms-and-conditions') {
    return <TermsAndConditionsPage onNavigate={navigateTo} />;
  }
  if (normalizedPath === '/refund-policy') {
    return <RefundPolicyPage onNavigate={navigateTo} />;
  }
  if (normalizedPath === '/privacy-policy') {
    return <PrivacyPolicyPage onNavigate={navigateTo} />;
  }

  // If loading authentication state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Loading Pawn Shop Management...
        </p>
      </div>
    );
  }

  // Unauthenticated Screens (unverified users are strictly blocked from protected workspace)
  if (!currentUser) {
    if (pendingVerificationUser) {
      return <EmailVerificationScreen />;
    }

    if (authView === 'login') {
      return (
        <LoginScreen
          onBack={() => setAuthView('welcome')}
          onOpenRegister={() => setAuthView('register')}
          onOpenForgotPassword={() => setAuthView('forgot')}
          onNavigate={navigateTo}
        />
      );
    }

    if (authView === 'register') {
      return (
        <CreateAccountScreen
          onBackToLogin={() => setAuthView('login')}
          onNavigate={navigateTo}
        />
      );
    }

    if (authView === 'forgot') {
      return (
        <ForgotPasswordScreen
          onBackToLogin={() => setAuthView('login')}
          onNavigate={navigateTo}
        />
      );
    }

    return (
      <WelcomeScreen
        onOpenLogin={() => setAuthView('login')}
        onNavigate={navigateTo}
      />
    );
  }

  // App Lock Overlay
  if (isLocked) {
    return <AppLockScreen />;
  }

  // Real-time Subscription Pause Screen (Enforced instantaneously from Admin Panel)
  const isSubscriptionPaused =
    subscription?.status === 'Paused' ||
    Boolean(shopProfile?.isSuspended && shopProfile?.disabledReason?.toLowerCase().includes('pause')) ||
    Boolean(shopProfile?.suspensionReason?.toLowerCase().includes('pause'));

  if (currentUser && isSubscriptionPaused) {
    return <SubscriptionPausedScreen reason={shopProfile?.disabledReason || shopProfile?.suspensionReason} />;
  }

  const titles: Record<NavigationTab, string> = {
    home: 'Shop Dashboard',
    bills: 'Pledge Bills Ledger',
    payments: 'Payment Transactions',
    closing: 'Closing Bills & Settlements',
    parties: 'Customer Directory',
    expired: 'Expired Bills Vault',
    analytics: 'Financial Analytics & Cashflow',
    settings: 'App Settings',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Navigation: 25-30% on desktop */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'parties') {
            setSelectedParty(null);
            setPreselectedCustomerForBill(null);
          }
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Right Main Workspace (70-75% on desktop) */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen min-w-0">
        <Header
          title={titles[currentTab] || 'Workspace'}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {/* 1. Home Module */}
          {currentTab === 'home' && (
            <DashboardHome
              parties={activeParties}
              bills={activeBills}
              payments={activePayments}
              closingBills={activeClosingBills}
              settings={settings}
              onNavigateToBills={() => setCurrentTab('bills')}
              onNavigateToParties={() => setCurrentTab('parties')}
              onSelectParty={(party) => {
                setSelectedParty(party);
                setCurrentTab('parties');
              }}
              onOpenAddBill={handleOpenAddBillFromHome}
              onOpenAddPayment={handleOpenAddPaymentFromHome}
              onOpenAddClosingBill={handleOpenAddClosingFromHome}
              onOpenAddParty={() => {
                setSelectedParty(null);
                setCurrentTab('parties');
              }}
              onViewReceipt={handleViewReceipt}
            />
          )}

          {/* 2. Bills Module */}
          {currentTab === 'bills' && (
            <BillsView
              bills={activeBills}
              parties={activeParties}
              settings={settings}
              onSaveBill={handleSaveBill}
              onOpenPayment={(p, b) => {
                setModalParty(p);
                setModalBill(b);
                setShowAddPaymentModal(true);
              }}
              onOpenCloseBill={(p, b) => {
                setModalParty(p);
                setModalBill(b);
                setShowCloseBillModal(true);
              }}
              onViewReceipt={handleViewReceipt}
              onEditBill={(b) => setEditingBill(b)}
            />
          )}

          {/* 3. Payments Module */}
          {currentTab === 'payments' && (
            <PaymentsView
              payments={activePayments}
              bills={activeBills}
              parties={activeParties}
              onOpenPaymentModal={handleOpenAddPaymentFromHome}
              onEditPayment={(p) => setEditingPayment(p)}
            />
          )}

          {/* 4. Closing Bills Module */}
          {currentTab === 'closing' && (
            <ClosingBillsView
              closingBills={activeClosingBills}
              bills={activeBills}
              parties={activeParties}
              onOpenCloseBillModal={handleOpenAddClosingFromHome}
              onViewReceipt={handleViewReceipt}
              onEditClosingBill={(c) => setEditingClosingBill(c)}
            />
          )}

          {/* 5. Parties Module */}
          {currentTab === 'parties' && (
            <div className="space-y-6">
              {selectedParty ? (
                <PartyDetailView
                  party={selectedParty}
                  bills={activeBills}
                  payments={activePayments}
                  closingBills={activeClosingBills}
                  onClose={() => setSelectedParty(null)}
                  onOpenAddBill={(p) => {
                    setPreselectedCustomerForBill(p);
                    setSelectedParty(null);
                    setCurrentTab('parties');
                  }}
                  onOpenPayment={(p, b) => {
                    setModalParty(p);
                    setModalBill(b || null);
                    setShowAddPaymentModal(true);
                  }}
                  onOpenCloseBill={(p, b) => {
                    setModalParty(p);
                    setModalBill(b);
                    setShowCloseBillModal(true);
                  }}
                  onEditBill={(b) => setEditingBill(b)}
                  onEditPayment={(p) => setEditingPayment(p)}
                  onEditClosingBill={(c) => setEditingClosingBill(c)}
                />
              ) : (
                <>
                  <AddPartyForm onSave={handleSaveParty} />
                  <AddBillForm
                    parties={activeParties}
                    selectedParty={preselectedCustomerForBill}
                    settings={settings}
                    onSave={handleSaveBill}
                    onCancel={() => {
                      if (preselectedCustomerForBill) {
                        setSelectedParty(preselectedCustomerForBill);
                        setPreselectedCustomerForBill(null);
                      }
                    }}
                  />
                  <PartyList
                    parties={activeParties}
                    onSelectParty={(p) => setSelectedParty(p)}
                  />
                </>
              )}
            </div>
          )}

          {/* 6. Expired Bills Module */}
          {currentTab === 'expired' && (
            <ExpiredBillsView
              bills={activeBills}
              parties={activeParties}
              settings={settings}
              onRepublishBill={handleRepublishBill}
              onViewReceipt={handleViewReceipt}
            />
          )}

          {/* 7. Analytics Module */}
          {currentTab === 'analytics' && (
            <AnalyticsView
              bills={activeBills}
              payments={activePayments}
              closingBills={activeClosingBills}
              parties={activeParties}
            />
          )}

          {/* 8. Settings Module */}
          {currentTab === 'settings' && (
            <AppSettings
              settings={settings}
              onUpdateSettings={setSettings}
              onNavigate={navigateTo}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Floating 3-Dot Menu Button */}
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden fixed bottom-5 right-5 z-40 bg-brand-950 text-white p-3.5 rounded-full shadow-2xl border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-900 transition-transform active:scale-95"
        aria-label="Open Navigation Menu"
        title="Open Navigation Menu"
      >
        <MoreVertical className="w-5 h-5 text-accent-400" />
      </button>

      {/* Modals */}
      {showAddPaymentModal && (
        <AddPaymentModal
          party={modalParty}
          bill={modalBill}
          allPartyBills={modalParty ? activeBills.filter((b) => b.partyId === modalParty.id) : activeBills}
          allParties={activeParties}
          allBills={activeBills}
          onClose={() => {
            setShowAddPaymentModal(false);
            setModalParty(null);
            setModalBill(null);
          }}
          onSavePayment={handleSavePayment}
        />
      )}

      {showCloseBillModal && (
        <CloseBillModal
          party={modalParty}
          bill={modalBill}
          allPartyBills={modalParty ? activeBills.filter((b) => b.partyId === modalParty.id) : activeBills}
          allParties={activeParties}
          allBills={activeBills}
          settings={settings}
          onClose={() => {
            setShowCloseBillModal(false);
            setModalParty(null);
            setModalBill(null);
          }}
          onConfirmClose={handleCloseBill}
        />
      )}

      {/* 3 Edit / Alter System Modals */}
      {editingBill && (
        <EditBillModal
          bill={editingBill}
          party={activeParties.find((p) => p.id === editingBill.partyId)}
          onClose={() => setEditingBill(null)}
          onSuccess={handleSaveEditedBill}
        />
      )}

      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment}
          availableBills={activeBills}
          onClose={() => setEditingPayment(null)}
          onSuccess={handleSaveEditedPayment}
        />
      )}

      {editingClosingBill && (
        <EditClosingBillModal
          closingBill={editingClosingBill}
          linkedBill={activeBills.find((b) => b.id === editingClosingBill.billId)}
          onClose={() => setEditingClosingBill(null)}
          onSuccess={handleSaveEditedClosingBill}
        />
      )}

      {/* Watermarked Bill Receipt Modal */}
      {receiptBill && (
        <BillReceiptModal
          bill={receiptBill}
          party={receiptParty || undefined}
          shopProfile={shopProfile}
          closingBill={receiptClosing}
          onClose={() => {
            setReceiptBill(null);
            setReceiptParty(null);
            setReceiptClosing(null);
          }}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <AppLockProvider>
            <DemoProvider>
              <MainApplication />
            </DemoProvider>
          </AppLockProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
