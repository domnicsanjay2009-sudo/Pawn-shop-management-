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
  Sparkles
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
import { Party, Bill, Payment, ClosingBill } from '../../types';
import { formatCurrencyPaise, formatDate } from '../../utils/formatters';
import { useDemo } from '../../context/DemoContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DashboardHomeProps {
  parties: Party[];
  bills: Bill[];
  payments: Payment[];
  closingBills: ClosingBill[];
  onNavigateToParties: () => void;
  onSelectParty: (party: Party) => void;
  onOpenAddBill: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  parties,
  bills,
  payments,
  closingBills,
  onNavigateToParties,
  onSelectParty,
  onOpenAddBill,
}) => {
  const { isDemoMode } = useDemo();

  // Compute real metrics strictly calculated from records as required
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

  // Chart 1: Category breakdown (Gold vs Silver vs Others)
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

  // Chart 2: Recent Monthly Disbursements vs Payments
  const barChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    // Last 6 months labels
    const last6Labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      last6Labels.push(months[idx]);
    }

    // Aggregate bills & payments
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
      {/* Demo Mode Notice Banner if active */}
      {isDemoMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-amber-900 shadow-xs">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">Demo Mode Active</p>
              <p className="text-xs text-amber-700">
                You are testing features using temporary in-memory sample records. All data will be automatically erased when you exit Demo Mode.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Loans Issued */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Total Loans Disbursed
            </p>
            <h4 className="text-2xl font-extrabold text-brand-950 mt-1">
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
            <h4 className="text-2xl font-extrabold text-accent-600 mt-1">
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
            <h4 className="text-2xl font-extrabold text-emerald-600 mt-1">
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
            <h4 className="text-2xl font-extrabold text-brand-950 mt-1">
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

      {/* Analytics & Business Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart: Loans vs Collections */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-brand-950">Disbursements vs Collections</h3>
              <p className="text-xs text-slate-500">Track loan volume against repayment cashflow</p>
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

        {/* Collateral Categories Doughnut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
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

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-brand-950 to-brand-900 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Counter Operations</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Quickly register parties, generate compliant pledge bills, record part-payments, and issue closing settlement receipts.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={onNavigateToParties}
            className="px-4 py-2.5 bg-white text-brand-950 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Manage Parties
          </button>
          <button
            onClick={onOpenAddBill}
            className="px-4 py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Pledge Bill</span>
          </button>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-brand-950">Recent Pledge Bills</h3>
            <p className="text-xs text-slate-500">Live records from your shop ledger</p>
          </div>
          <button
            onClick={onNavigateToParties}
            className="text-xs font-bold text-accent-600 hover:text-accent-700 flex items-center space-x-1"
          >
            <span>View All Parties</span>
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
                <th className="p-3.5">Rate & Term</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No bills issued yet. Create your first pledge bill to see it here.
                  </td>
                </tr>
              ) : (
                bills.slice(0, 5).map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => {
                      const p = parties.find((part) => part.id === b.partyId);
                      if (p) onSelectParty(p);
                    }}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="p-3.5 pl-6 font-bold font-mono text-brand-950">{b.billNumber}</td>
                    <td className="p-3.5 font-medium text-slate-800">{b.partyName}</td>
                    <td className="p-3.5 text-slate-600">
                      <span className="font-semibold text-brand-950">{b.itemCategory}</span> -{' '}
                      {b.itemDescription}
                    </td>
                    <td className="p-3.5 font-bold text-brand-950">
                      {formatCurrencyPaise(b.principalPaise)}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {b.interestPercentage}% / {b.interestDuration}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">{formatDate(b.billDate)}</td>
                    <td className="p-3.5 pr-6 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
