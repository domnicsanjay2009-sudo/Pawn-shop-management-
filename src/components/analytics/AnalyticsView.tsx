import React, { useMemo } from 'react';
import {
  TrendingUp,
  FileText,
  CreditCard,
  CheckCircle,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  Calendar,
  AlertTriangle
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
import { Bill, Payment, ClosingBill, Party } from '../../types';
import { formatCurrencyPaise } from '../../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface AnalyticsViewProps {
  bills: Bill[];
  payments: Payment[];
  closingBills: ClosingBill[];
  parties: Party[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  bills,
  payments,
  closingBills,
  parties,
}) => {
  // Compute metrics with strict invariant:
  // DO NOT count expired bills as closed or settled bills!
  const metrics = useMemo(() => {
    const totalLoansDisbursedPaise = bills.reduce((acc, b) => acc + (b.principalPaise || 0), 0);
    const totalPaymentsReceivedPaise = payments.reduce((acc, p) => acc + (p.amountPaise || 0), 0);
    const totalInterestReceivedPaise = payments.reduce((acc, p) => acc + (p.interestPortionPaise || 0), 0);

    const activeBills = bills.filter((b) => b.status === 'Active');
    // Strictly filter out expired bills from closed counts
    const closedBills = bills.filter((b) => b.status === 'Closed');
    const expiredBills = bills.filter((b) => b.status === 'Expired' || b.isExpired);

    const outstandingPrincipalPaise = activeBills.reduce(
      (acc, b) => acc + (b.currentPrincipalPaise || 0),
      0
    );

    const totalClosingSettlementPaise = closingBills.reduce(
      (acc, c) => acc + (c.finalSettlementAmountPaise || 0),
      0
    );

    return {
      totalLoansDisbursedPaise,
      totalPaymentsReceivedPaise,
      totalInterestReceivedPaise,
      outstandingPrincipalPaise,
      totalClosingSettlementPaise,
      activeBillsCount: activeBills.length,
      closedBillsCount: closedBills.length,
      expiredBillsCount: expiredBills.length,
      totalCustomersCount: parties.length,
    };
  }, [bills, payments, closingBills, parties]);

  // Chart 1: Collateral Category Breakdown
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

  // Chart 2: Monthly Disbursements vs Collections
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
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-brand-950">
          Financial Analytics & Cashflow
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time metrics, disbursements, loan interest yield, and portfolio performance.
        </p>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Total Loans Disbursed
            </p>
            <h4 className="text-2xl font-extrabold text-brand-950 mt-1 font-mono">
              {formatCurrencyPaise(metrics.totalLoansDisbursedPaise)}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Across {bills.length} total pledge bills
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-accent-600 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

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

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Payments Collected
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

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Settled & Expired
            </p>
            <h4 className="text-2xl font-extrabold text-brand-950 mt-1 font-mono">
              {metrics.closedBillsCount} Closed
            </h4>
            <p className="text-[11px] text-amber-600 mt-0.5 font-medium">
              {metrics.expiredBillsCount} Expired (Untouched)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart: Loans vs Collections */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
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

        {/* Collateral Mix Doughnut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-brand-950 mb-1">Pawn Collateral Mix</h3>
            <p className="text-xs text-slate-500 mb-4">Distribution by ornament type</p>
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
    </div>
  );
};
