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
import { AddPartyForm } from './components/parties/AddPartyForm';
import { PartyList } from './components/parties/PartyList';
import { PartyDetailView } from './components/parties/PartyDetailView';
import { AddBillForm } from './components/bills/AddBillForm';
import { AddPaymentModal } from './components/payments/AddPaymentModal';
import { CloseBillModal } from './components/closing/CloseBillModal';
import { SubscriptionPlans } from './components/subscription/SubscriptionPlans';
import { SubscriptionHistory } from './components/subscription/SubscriptionHistory';
import { ChatContainer } from './components/chat/ChatContainer';
import { AppSettings } from './components/settings/AppSettings';

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

  // Modals
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showCloseBillModal, setShowCloseBillModal] = useState(false);
  const [modalParty, setModalParty] = useState<Party | null>(null);
  const [modalBill, setModalBill] = useState<Bill | null>(null);

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
        />
      );
    }

    if (authView === 'register') {
      return <CreateAccountScreen onBackToLogin={() => setAuthView('login')} />;
    }

    if (authView === 'forgot') {
      return <ForgotPasswordScreen onBackToLogin={() => setAuthView('login')} />;
    }

    return <WelcomeScreen onOpenLogin={() => setAuthView('login')} />;
  }

  // App Lock Overlay
  if (isLocked) {
    return <AppLockScreen />;
  }

  const titles: Record<NavigationTab, string> = {
    home: 'Shop Dashboard',
    parties: 'Customers & Parties',
    subscription: 'Subscription & Plans',
    'subscription-history': 'Subscription History',
    chat: 'Customer Care & AI Chat',
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

      {/* Right Main Workspace */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen min-w-0">
        <Header
          title={titles[currentTab] || 'Workspace'}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'home' && (
            <DashboardHome
              parties={activeParties}
              bills={activeBills}
              payments={activePayments}
              closingBills={activeClosingBills}
              onNavigateToParties={() => setCurrentTab('parties')}
              onSelectParty={(party) => {
                setSelectedParty(party);
                setCurrentTab('parties');
              }}
              onOpenAddBill={() => {
                setPreselectedCustomerForBill(null);
                setSelectedParty(null);
                setCurrentTab('parties');
              }}
            />
          )}

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
                    // Navigate directly to Add Pledge Bill creation with this customer preselected
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

          {currentTab === 'subscription' && <SubscriptionPlans />}

          {currentTab === 'subscription-history' && <SubscriptionHistory />}

          {currentTab === 'chat' && <ChatContainer />}

          {currentTab === 'settings' && (
            <AppSettings
              settings={settings}
              onUpdateSettings={setSettings}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {showAddPaymentModal && modalParty && (
        <AddPaymentModal
          party={modalParty}
          bill={modalBill || undefined}
          allPartyBills={activeBills.filter((b) => b.partyId === modalParty.id)}
          onClose={() => {
            setShowAddPaymentModal(false);
            setModalBill(null);
          }}
          onSavePayment={handleSavePayment}
        />
      )}

      {showCloseBillModal && modalParty && modalBill && (
        <CloseBillModal
          party={modalParty}
          bill={modalBill}
          onClose={() => {
            setShowCloseBillModal(false);
            setModalBill(null);
          }}
          onConfirmClose={handleCloseBill}
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
