import React, { useMemo } from 'react';
import {
  TrendingUp,
  FileText,
  CreditCard,
  CheckCircle,
  Users,
  Coins,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  Eye
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Party, Bill, Payment, ClosingBill, AppSettings } from '../../types';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ShopLogoBadge } from '../common/ShopLogoBadge';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DashboardHomeProps {
  parties: Party[];
  bills: Bill[];
  payments: Payment[];
  closingBills: ClosingBill[];
  settings?: AppSettings;
  onNavigateToBills: () => void;
  onNavigateToParties: () => void;
  onSelectParty: (party: Party) => void;
  onOpenAddBill: () => void;
  onOpenAddPayment: () => void;
  onOpenAddClosingBill: () => void;
  onOpenAddParty: () => void;
  onViewReceipt: (bill: Bill, party?: Party) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  parties,
  bills,
  payments,
  closingBills,
  settings,
  onNavigateToBills,
  onNavigateToParties,
  onSelectParty,
  onOpenAddBill,
  onOpenAddPayment,
  onOpenAddClosingBill,
  onOpenAddParty,
  onViewReceipt,
}) => {
  const { shopProfile } = useAuth();

  // Authoritative financial calculations
  const metrics = useMemo(() => {
    const totalLoansIssuedPaise = bills.reduce((acc, b) => acc + (b.principalPaise || 0), 0);
    const totalPaymentsReceivedPaise = payments.reduce((acc, p) => acc + (p.amountPaise || 0), 0);
    const totalInterestReceivedPaise = payments.reduce((acc, p) => acc + (p.interestPortionPaise || 0), 0);

    const activeBills = bills.filter((b) => b.status === 'Active');
    const closedBills = bills.filter((b) => b.status === 'Closed');

    const outstandingPrincipalPaise = activeBills.reduce(
      (acc, b) => acc + (b.currentPrincipalPaise || 0),
      0
    );

    return {
      totalLoansIssuedPaise,
      totalPaymentsReceivedPaise,
      totalInterestReceivedPaise,
      outstandingPrincipalPaise,
      activeBillsCount: activeBills.length,
      closedBillsCount: closedBills.length,
      totalCustomersCount: parties.length,
    };
  }, [bills, payments, parties]);

  // Collateral mix chart
  const categoryChartData = useMemo(() => {
    let goldCount = 0;
    let silverCount = 0;
    let othersCount = 0;

    bills.forEach((b) => {
      if (b.itemCategory === 'Gold') goldCount++;
      else if (b.itemCategory === 'Silver') silverCount++;
      else othersCount++;
    });

    return {
      labels: ['Gold', 'Silver', 'Others'],
      datasets: [
        {
          data: [goldCount, silverCount, othersCount],
          backgroundColor: ['#eab308', '#94a3b8', '#3b82f6'],
          borderWidth: 0,
        },
      ],
    };
  }, [bills]);

  // Monthly Disbursements vs Collections
  const barChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const last6Labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      last6Labels.push(months[idx]);
    }

    const loansData = [0, 0, 0, 0, 0, 0];
    const paymentsData = [0, 0, 0, 0, 0, 0];

    bills.forEach((b) => {
      const m = new Date(b.billDate).getMonth();
      const pos = last6Labels.indexOf(months[m]);
      if (pos !== -1) {
        loansData[pos] += b.principalPaise / 100;
      }
    });

    payments.forEach((p) => {
      const m = new Date(p.paymentDate).getMonth();
      const pos = last6Labels.indexOf(months[m]);
      if (pos !== -1) {
        paymentsData[pos] += p.amountPaise / 100;
      }
    });

    return {
      labels: last6Labels,
      datasets: [
        {
          label: 'Loans Disbursed (₹)',
          data: loansData,
          backgroundColor: '#2563eb',
          borderRadius: 6,
        },
        {
          label: 'Payments Collected (₹)',
          data: paymentsData,
          backgroundColor: '#10b981',
          borderRadius: 6,
        },
      ],
    };
  }, [bills, payments]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Shop Identity Strip */}
      {shopProfile && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center space-x-3.5 min-w-0">
            <ShopLogoBadge
              logoUrl={shopProfile.logoUrl}
              shopName={shopProfile.shopName}
              sizeClass="w-12 h-12"
              iconClass="w-6 h-6 text-white"
              roundedClass="rounded-2xl"
              fallbackBgClass="bg-brand-950 shadow-xs"
            />
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-brand-950 truncate">
                {shopProfile.shopName}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Owner: <span className="font-semibold text-slate-700">{shopProfile.ownerName}</span>
                {shopProfile.phone ? ` • ${shopProfile.phone}` : ''}
              </p>
            </div>
          </div>
          {shopProfile.address && (
            <p className="text-xs text-slate-500 sm:text-right max-w-sm truncate">
              {shopProfile.address}
            </p>
          )}
        </div>
      )}

      {/* QUICK-ACTION CARDS (Add Bill, Add Closing Bill, Add Payment, Add Party) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Counter Actions
          </h3>
          <span className="text-[11px] text-slate-400">Click to expand</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Add Bill */}
          <button
            onClick={onOpenAddBill}
            className="p-4 sm:p-5 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-accent-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-brand-950 group-hover:text-accent-600 transition-colors">
                Add Bill
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Create new pledge loan
              </p>
            </div>
          </button>

          {/* Card 2: Add Closing Bill */}
          <button
            onClick={onOpenAddClosingBill}
            className="p-4 sm:p-5 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-brand-950 group-hover:text-emerald-600 transition-colors">
                Add Closing Bill
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Settle &amp; redeem pledge
              </p>
            </div>
          </button>

          {/* Card 3: Add Payment */}
          <button
            onClick={onOpenAddPayment}
            className="p-4 sm:p-5 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-brand-950 group-hover:text-amber-600 transition-colors">
                Add Payment
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Record partial payment
              </p>
            </div>
          </button>

          {/* Card 4: Add Party */}
          <button
            onClick={onOpenAddParty}
            className="p-4 sm:p-5 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-brand-950 group-hover:text-purple-600 transition-colors">
                Add Party
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Register new customer
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Loans Issued */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Total Loans Disbursed
            </p>
            <h4 className="text-2xl font-extrabold text-brand-950 mt-1 font-mono">
              {formatCurrencyPaise(metrics.totalLoansIssuedPaise)}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Across {bills.length} total pledge bills
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-accent-600 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Outstanding Principal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Outstanding Balance
            </p>
            <h4 className="text-2xl font-extrabold text-accent-600 mt-1 font-mono">
              {formatCurrencyPaise(metrics.outstandingPrincipalPaise)}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {metrics.activeBillsCount} active collateral pledges
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Total Payments Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Payments Received
            </p>
            <h4 className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
              {formatCurrencyPaise(metrics.totalPaymentsReceivedPaise)}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Includes {formatCurrencyPaise(metrics.totalInterestReceivedPaise)} interest
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Total Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Total Customers
            </p>
            <h4 className="text-2xl font-extrabold text-brand-950 mt-1 font-mono">
              {metrics.totalCustomersCount}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {metrics.closedBillsCount} closed / settled loans
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics & Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-brand-950">Disbursements vs Collections</h3>
              <p className="text-xs text-slate-500">Track loan outflow against cashflow collected</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Monthly</span>
          </div>
          <div className="h-64 w-full">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', labels: { boxWidth: 12 } },
                },
                scales: {
                  y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-brand-950 mb-1">Pawn Collateral Mix</h3>
            <p className="text-xs text-slate-500 mb-4">Distribution by item category</p>
          </div>
          <div className="h-52 relative flex items-center justify-center">
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10 } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-brand-950">Recent Pledge Bills</h3>
            <p className="text-xs text-slate-500">Latest active records from your ledger</p>
          </div>
          <button
            onClick={onNavigateToBills}
            className="text-xs font-bold text-accent-600 hover:text-accent-700 flex items-center space-x-1 cursor-pointer"
          >
            <span>View All Bills</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="p-3.5 pl-6">Bill No</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Collateral Item</th>
                <th className="p-3.5">Principal</th>
                <th className="p-3.5">Rate &amp; Term</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 pr-6 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No bills issued yet. Create your first pledge bill to see it here.
                  </td>
                </tr>
              ) : (
                bills.slice(0, 5).map((b) => {
                  const p = parties.find((part) => part.id === b.partyId);

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="p-3.5 pl-6 font-bold font-mono text-brand-950">
                        {b.billNumber}
                      </td>
                      <td
                        onClick={() => {
                          if (p) onSelectParty(p);
                        }}
                        className="p-3.5 font-medium text-slate-800 hover:text-accent-600 cursor-pointer"
                      >
                        {b.partyName}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <span className="font-semibold text-brand-950">{b.itemCategory}</span> -{' '}
                        {b.itemDescription}
                      </td>
                      <td className="p-3.5 font-bold font-mono text-brand-950">
                        {formatCurrencyPaise(b.principalPaise)}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">
                        {b.interestPercentage}% / {b.interestDuration}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">{formatDate(b.billDate)}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : b.status === 'Expired'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        <button
                          onClick={() => onViewReceipt(b, p)}
                          className="p-1.5 text-slate-500 hover:text-brand-950 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
