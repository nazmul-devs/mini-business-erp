"use client";

import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  ShieldCheck,
  Package,
  FileSpreadsheet,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-indigo-950/40 to-slate-900 border border-indigo-500/20 backdrop-blur-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authenticated Session</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Hello, {user?.name || "Business Operator"}!
          </h1>
          <p className="text-slate-300 text-sm mt-1.5 max-w-2xl">
            Welcome to Mini Business ERP. Manage your clients, track product inventory, record sales invoices, and monitor operational expenses in one unified portal.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Sales</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">৳ 128,450.00</div>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <span>+14.2%</span> <span className="text-slate-400">vs last month</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Purchases</span>
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">৳ 84,200.00</div>
          <p className="text-xs text-slate-400 mt-1">
            <span>12 invoices received</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">৳ 14,800.00</div>
          <p className="text-xs text-slate-400 mt-1">
            <span>Rent, utilities & logistics</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Parties</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">5 Partners</div>
          <p className="text-xs text-slate-400 mt-1">
            <span>Vendors & client accounts</span>
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Core Business Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Parties Directory</h3>
            <p className="text-xs text-slate-400 mt-1">
              Manage suppliers, customer profiles, opening balances, and contact info.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Product Inventory</h3>
            <p className="text-xs text-slate-400 mt-1">
              Stock counts, SKU codes, pricing, units, and low inventory warning thresholds.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Financial Reports</h3>
            <p className="text-xs text-slate-400 mt-1">
              Sales vs purchases balance, net profit calculation, and ledger exports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
