import React, { createContext, useContext, useState, useEffect } from 'react';
import { demoStore } from '../services/demoDataService';
import { Party, Bill, Payment, ClosingBill } from '../types';

interface DemoContextType {
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  // In-memory demo data operations
  demoParties: Party[];
  demoBills: Bill[];
  demoPayments: Payment[];
  demoClosingBills: ClosingBill[];
  addDemoParty: (p: any) => Party;
  addDemoBill: (b: any) => Bill;
  addDemoPayment: (p: any) => Payment;
  closeDemoBill: (c: any) => ClosingBill;
  refreshDemoData: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoParties, setDemoParties] = useState<Party[]>([]);
  const [demoBills, setDemoBills] = useState<Bill[]>([]);
  const [demoPayments, setDemoPayments] = useState<Payment[]>([]);
  const [demoClosingBills, setDemoClosingBills] = useState<ClosingBill[]>([]);

  const refreshDemoData = () => {
    setDemoParties(demoStore.getParties());
    setDemoBills(demoStore.getBills());
    setDemoPayments(demoStore.getPayments());
    setDemoClosingBills(demoStore.getClosingBills());
  };

  const enterDemoMode = () => {
    demoStore.reset();
    refreshDemoData();
    setIsDemoMode(true);
  };

  const exitDemoMode = () => {
    demoStore.reset();
    refreshDemoData();
    setIsDemoMode(false);
  };

  // Erase all Demo Mode data if the app is closed/reloaded
  useEffect(() => {
    const handleBeforeUnload = () => {
      demoStore.reset();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const addDemoParty = (data: any) => {
    const p = demoStore.addParty(data);
    refreshDemoData();
    return p;
  };

  const addDemoBill = (data: any) => {
    const b = demoStore.addBill(data);
    refreshDemoData();
    return b;
  };

  const addDemoPayment = (data: any) => {
    const pay = demoStore.addPayment(data);
    refreshDemoData();
    return pay;
  };

  const closeDemoBill = (data: any) => {
    const c = demoStore.closeBill(data);
    refreshDemoData();
    return c;
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        enterDemoMode,
        exitDemoMode,
        demoParties,
        demoBills,
        demoPayments,
        demoClosingBills,
        addDemoParty,
        addDemoBill,
        addDemoPayment,
        closeDemoBill,
        refreshDemoData,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo must be used within DemoProvider');
  return context;
};
