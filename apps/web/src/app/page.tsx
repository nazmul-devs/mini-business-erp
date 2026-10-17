"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight, CheckCircle2, LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-indigo-500/15 via-violet-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Navigation */}
      <header className="relative z-10 border-b border-slate-800/80 backdrop-blur-md bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-lg text-white">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span>Mini Business ERP</span>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard ({user?.name?.split(" ")[0]})</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-slate-300 hover:text-white text-sm font-medium transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Get Started</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 relative z-10 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span>Full-Stack Monorepo Scaffold Ready</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Modern Business ERP for{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
            Purchases, Sales & Inventory
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl">
          Complete management solution for vendors, clients, products, purchase receipts, billing invoices, stock movements, and real-time ledger accounting.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-xl shadow-indigo-600/25"
          >
            <span>{isAuthenticated ? "Enter Dashboard" : "Sign In to ERP Portal"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!isAuthenticated && (
            <Link
              href="/register"
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold rounded-xl text-sm transition-all"
            >
              <span>Create Account</span>
            </Link>
          )}
        </div>

        {/* Highlights */}
        <div className="mt-14 pt-10 border-t border-slate-800/80 w-full grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1.5" />
            <div className="text-sm font-semibold text-white">Party Management</div>
            <div className="text-xs text-slate-400 mt-0.5">Vendors & Clients</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1.5" />
            <div className="text-sm font-semibold text-white">Stock Tracking</div>
            <div className="text-xs text-slate-400 mt-0.5">Automated movements</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1.5" />
            <div className="text-sm font-semibold text-white">Invoicing & Orders</div>
            <div className="text-xs text-slate-400 mt-0.5">Sales & Purchases</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1.5" />
            <div className="text-sm font-semibold text-white">JWT Authentication</div>
            <div className="text-xs text-slate-400 mt-0.5">Protected Sessions</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 relative z-10">
        Mini Business ERP • Powered by Next.js, Express, PostgreSQL & Redis
      </footer>
    </div>
  );
}
