"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  PlusCircle,
  Search,
  ArrowRight,
  Database,
  Lock,
  Cpu,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from "lucide-react";

export default function HomePage() {
  const [searchId, setSearchId] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      router.push(`/verify/${searchId.trim()}`);
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative pt-8 pb-12 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#00CC9B] text-xs font-semibold uppercase tracking-wider">
          <Cpu className="w-3.5 h-3.5" />
          <span>CKB Cell Model Primitive • Week 5</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Proof of X — <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00CC9B] via-emerald-400 to-sky-400">
            CKB-Native Attestation
          </span>
        </h1>

        <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          The protocol represents an attestation as an <strong className="text-white">owned CKB Cell</strong> whose state transitions (<code className="text-[#00CC9B]">VALID</code> → <code className="text-amber-400">REVOKED</code>) are strictly enforced on-chain via Type Scripts.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/issue"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#00CC9B] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Issue Proof of Contribution</span>
          </Link>

          <Link
            href="/verify"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all"
          >
            <Search className="w-4 h-4 text-[#00CC9B]" />
            <span>Verify a Proof</span>
          </Link>
        </div>

        {/* Quick Search Bar */}
        <div className="pt-8 max-w-xl mx-auto">
          <form onSubmit={handleSearch} className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 focus-within:border-emerald-500/50 shadow-inner">
            <Search className="w-5 h-5 text-slate-500 ml-3 shrink-0" />
            <input
              type="text"
              placeholder="Enter 32-byte attestation_id (0x...)"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none px-2 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-[#00CC9B] text-xs font-semibold transition-colors shrink-0"
            >
              Verify
            </button>
          </form>
        </div>
      </section>

      {/* Protocol Architecture & Honest Test */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#00CC9B]">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">1. Owned Cell Primitive</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            The attestation is an actual CKB Cell owned by the contributor's Lock Script. The holder truly owns the data and storage capacity on Nervos CKB.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">2. Type Script Enforced</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Authorization is enforced by the CKB Type Script containing the <code className="text-sky-300">issuer_lock_hash</code>. Frontend or backend servers are never the authority.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">3. Zero Off-Chain DB</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            CKB UTXO state is the single source of truth. Verifiers query the live node indexer directly to audit the 7 cryptographic invariants.
          </p>
        </div>
      </section>

      {/* State Machine Overview */}
      <section className="glass-card p-8 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">On-Chain State Machine</h2>
            <p className="text-xs text-slate-400 mt-1">
              Strict unidirectional state transitions validated by CKB-VM
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
            Rule: Irreversible Lifecycle
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>State: 0</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Uncreated</span>
            </div>
            <div className="text-base font-bold text-slate-200">NONE</div>
            <p className="text-xs text-slate-400">No Cell exists. Issuer generates deterministic attestation_id from input OutPoint.</p>
          </div>

          {/* Arrow 1 */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
              <span>State: 1</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Active</span>
            </div>
            <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>VALID (status: 0)</span>
            </div>
            <p className="text-xs text-slate-400">Cell locked by Holder. Type Script checks Issuer signature. Claim is active.</p>
          </div>

          {/* Arrow 2 */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-amber-400">
              <span>State: 2</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Terminal</span>
            </div>
            <div className="text-base font-bold text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>REVOKED (status: 1)</span>
            </div>
            <p className="text-xs text-slate-400">Old cell consumed. New cell holds status=1. Irreversible. Never returns to VALID.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
